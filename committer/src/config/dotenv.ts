import {config} from 'dotenv';

config();
export const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
export const DATABASE_URL = process.env.DATABASE_URL || '';
