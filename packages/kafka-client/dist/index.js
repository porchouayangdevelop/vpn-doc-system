"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProducer = createProducer;
exports.publish = publish;
exports.createConsumer = createConsumer;
exports.ensureTopics = ensureTopics;
// packages/kafka-client/src/index.ts  — COMPLETE
const kafkajs_1 = require("kafkajs");
// ── Config builder ────────────────────────────────────────
function buildKafkaConfig(clientId) {
    return {
        clientId,
        brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
        retry: {
            retries: 8,
            initialRetryTime: 300,
            factor: 2,
            maxRetryTime: 30_000,
        },
        connectionTimeout: 10_000,
        requestTimeout: 30_000,
    };
}
// ── Producer factory ──────────────────────────────────────
async function createProducer(clientId) {
    const kafka = new kafkajs_1.Kafka(buildKafkaConfig(clientId));
    const producer = kafka.producer({
        createPartitioner: kafkajs_1.Partitioners.LegacyPartitioner,
        idempotent: true,
        maxInFlightRequests: 1,
        // compression:       CompressionTypes.GZIP,
        transactionTimeout: 30_000,
    });
    await producer.connect();
    console.info(`[kafka-client] Producer connected — clientId: ${clientId}`);
    return producer;
}
// ── publish ───────────────────────────────────────────────
async function publish(producer, topic, data, producerId, key, version = 1) {
    const event = {
        eventId: crypto.randomUUID(),
        topic,
        timestamp: new Date().toISOString(),
        producerId,
        version,
        data,
    };
    await producer.send({
        topic,
        messages: [{
                key: key ?? null,
                value: JSON.stringify(event),
            }],
    });
}
async function createConsumer(clientId, groupId, topics, handler, options) {
    const kafka = new kafkajs_1.Kafka(buildKafkaConfig(clientId));
    const consumer = kafka.consumer({
        groupId,
        sessionTimeout: options?.sessionTimeout ?? 30_000,
        heartbeatInterval: options?.heartbeatInterval ?? 3_000,
        maxBytesPerPartition: options?.maxBytesPerPartition ?? 1_048_576,
        retry: { retries: 5 },
    });
    await consumer.connect();
    for (const topic of topics) {
        await consumer.subscribe({
            topic,
            fromBeginning: options?.fromBeginning ?? false,
        });
    }
    await consumer.run({
        partitionsConsumedConcurrently: 3,
        eachMessage: async (payload) => {
            const { topic, message, partition, heartbeat } = payload;
            if (!message.value)
                return;
            let event;
            try {
                event = JSON.parse(message.value.toString());
            }
            catch {
                console.error(`[kafka-client] JSON parse error — topic: ${topic}`);
                return;
            }
            try {
                await handler(topic, event, payload);
                await heartbeat();
            }
            catch (err) {
                console.error({
                    topic, partition,
                    offset: message.offset,
                    eventId: event.eventId,
                    err,
                }, '[kafka-client] Handler error');
                // ໃນ production: push to dead-letter topic
            }
        },
    });
    console.info(`[kafka-client] Consumer connected — groupId: ${groupId}, topics: ${topics.join(', ')}`);
    return consumer;
}
// ── Topic manager (ensure topics exist) ───────────────────
async function ensureTopics(clientId, topics, numPartitions = 3, replicationFactor = 1) {
    const kafka = new kafkajs_1.Kafka(buildKafkaConfig(clientId));
    const admin = kafka.admin();
    await admin.connect();
    const existing = await admin.listTopics();
    const toCreate = topics.filter(t => !existing.includes(t));
    if (toCreate.length > 0) {
        await admin.createTopics({
            topics: toCreate.map(topic => ({
                topic,
                numPartitions,
                replicationFactor,
                configEntries: [
                    { name: 'retention.ms', value: '604800000' }, // 7 days
                    { name: 'compression.type', value: 'gzip' },
                ],
            })),
            waitForLeaders: true,
        });
        console.info(`[kafka-client] Created topics: ${toCreate.join(', ')}`);
    }
    await admin.disconnect();
}
//# sourceMappingURL=index.js.map