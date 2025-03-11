import { config } from 'dotenv';

config();
export const EVENT_TYPE = process.env.EVENT_TYPE || "0x53a0f5d5cf5105bec62831ee67ffd0583751a1a37c67b75c1d00bff176e27eec::Event::MessageEvent";
export const FUNCTION_TYPE = process.env.FUNCTION_TYPE;
export const BASE_URL = process.env.BASE_URL;
export const KAFKA_TOPICS = process.env.KAFKA_TOPIC?.split(",") || [];
export const KAFKA_BROKER = process.env.BROKER || "kafka:9092";