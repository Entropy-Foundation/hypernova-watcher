import { config } from 'dotenv';

config();
export const EVENT_TYPE = process.env.EVENT_TYPE || "0x864617e8841404a9bf6864ba9ecedb7a1e7f205cd25647be4b18813dab54f8e0::Event::MessageEvent";
export const FUNCTION_TYPE = process.env.FUNCTION_TYPE;
export const BASE_URL = process.env.BASE_URL;
export const KAFKA_TOPIC = process.env.KAFKA_TOPIC || "SUP_DEST_EVENT";
export const KAFKA_BROKER = process.env.BROKER || "kafka:9092";