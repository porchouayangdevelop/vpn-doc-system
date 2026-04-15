import { type Producer, type Consumer, type EachMessagePayload } from 'kafkajs';
import type { KafkaEvent, KafkaTopic } from '@vpndoc/shared-types';
export declare function createProducer(clientId: string): Promise<Producer>;
export declare function publish<T>(producer: Producer, topic: KafkaTopic, data: T, producerId: string, key?: string, version?: number): Promise<void>;
export type MessageHandler = (topic: KafkaTopic, event: KafkaEvent, payload: EachMessagePayload) => Promise<void>;
export declare function createConsumer(clientId: string, groupId: string, topics: KafkaTopic[], handler: MessageHandler, options?: {
    fromBeginning?: boolean;
    sessionTimeout?: number;
    heartbeatInterval?: number;
    maxBytesPerPartition?: number;
}): Promise<Consumer>;
export declare function ensureTopics(clientId: string, topics: KafkaTopic[], numPartitions?: number, replicationFactor?: number): Promise<void>;
//# sourceMappingURL=index.d.ts.map