// packages/kafka-client/src/index.ts  — COMPLETE
import {
  Kafka, type Producer, type Consumer,
  type EachMessagePayload,
  Partitioners, CompressionTypes,
  type KafkaConfig,
} from 'kafkajs'
import type { KafkaEvent, KafkaTopic } from '@vpndoc/shared-types'

// ── Config builder ────────────────────────────────────────
function buildKafkaConfig(clientId: string): KafkaConfig {
  return {
    clientId,
    brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
    retry: {
      retries:         8,
      initialRetryTime: 300,
      factor:          2,
      maxRetryTime:    30_000,
    },
    connectionTimeout: 10_000,
    requestTimeout:    30_000,
  }
}

// ── Producer factory ──────────────────────────────────────
export async function createProducer(clientId: string): Promise<Producer> {
  const kafka    = new Kafka(buildKafkaConfig(clientId))
  const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner,
    idempotent:        true,
    maxInFlightRequests: 1,
    // compression:       CompressionTypes.GZIP,

    transactionTimeout: 30_000,
  })

  await producer.connect()
  console.info(`[kafka-client] Producer connected — clientId: ${clientId}`)
  return producer
}

// ── publish ───────────────────────────────────────────────
export async function publish<T>(
  producer:   Producer,
  topic:      KafkaTopic,
  data:       T,
  producerId: string,
  key?:       string,
  version = 1,
): Promise<void> {
  const event: KafkaEvent<T> = {
    eventId:   crypto.randomUUID(),
    topic,
    timestamp: new Date().toISOString(),
    producerId,
    version,
    data,
  }
  await producer.send({
    topic,
    messages: [{
      key:   key ?? null,
      value: JSON.stringify(event),
    }],
  })
}

// ── Consumer factory ──────────────────────────────────────
export type MessageHandler = (
  topic:   KafkaTopic,
  event:   KafkaEvent,
  payload: EachMessagePayload,
) => Promise<void>

export async function createConsumer(
  clientId:  string,
  groupId:   string,
  topics:    KafkaTopic[],
  handler:   MessageHandler,
  options?: {
    fromBeginning?: boolean
    sessionTimeout?: number
    heartbeatInterval?: number
    maxBytesPerPartition?: number
  },
): Promise<Consumer> {
  const kafka    = new Kafka(buildKafkaConfig(clientId))
  const consumer = kafka.consumer({
    groupId,
    sessionTimeout:     options?.sessionTimeout     ?? 30_000,
    heartbeatInterval:  options?.heartbeatInterval  ?? 3_000,
    maxBytesPerPartition: options?.maxBytesPerPartition ?? 1_048_576,
    retry: { retries: 5 },
  })

  await consumer.connect()

  for (const topic of topics) {
    await consumer.subscribe({
      topic,
      fromBeginning: options?.fromBeginning ?? false,
    })
  }

  await consumer.run({
    partitionsConsumedConcurrently: 3,
    eachMessage: async (payload) => {
      const { topic, message, partition, heartbeat } = payload
      if (!message.value) return

      let event: KafkaEvent
      try {
        event = JSON.parse(message.value.toString()) as KafkaEvent
      } catch {
        console.error(`[kafka-client] JSON parse error — topic: ${topic}`)
        return
      }

      try {
        await handler(topic as KafkaTopic, event, payload)
        await heartbeat()
      } catch (err) {
        console.error({
          topic, partition,
          offset: message.offset,
          eventId: event.eventId,
          err,
        }, '[kafka-client] Handler error')
        // ໃນ production: push to dead-letter topic
      }
    },
  })

  console.info(`[kafka-client] Consumer connected — groupId: ${groupId}, topics: ${topics.join(', ')}`)
  return consumer
}

// ── Topic manager (ensure topics exist) ───────────────────
export async function ensureTopics(
  clientId: string,
  topics:   KafkaTopic[],
  numPartitions = 3,
  replicationFactor = 1,
): Promise<void> {
  const kafka = new Kafka(buildKafkaConfig(clientId))
  const admin = kafka.admin()
  await admin.connect()

  const existing = await admin.listTopics()
  const toCreate = topics.filter(t => !existing.includes(t))

  if (toCreate.length > 0) {
    await admin.createTopics({
      topics: toCreate.map(topic => ({
        topic,
        numPartitions,
        replicationFactor,
        configEntries: [
          { name: 'retention.ms',    value: '604800000' },  // 7 days
          { name: 'compression.type', value: 'gzip'    },
        ],
      })),
      waitForLeaders: true,
    })
    console.info(`[kafka-client] Created topics: ${toCreate.join(', ')}`)
  }

  await admin.disconnect()
}