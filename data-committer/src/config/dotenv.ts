import {config} from 'dotenv';

config();
export const KAFKA_TOPICS = process.env.KAFKA_TOPIC?.split(",") || [];
export const KAFKA_BROKER = process.env.BROKER || "kafka:9092";
export const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
