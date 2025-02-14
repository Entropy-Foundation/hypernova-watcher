import { Kafka } from 'kafkajs';
import prisma from './db/prismaClient';
import { KAFKA_BROKER } from './config/dotenv';

const topic = process.argv[2];
console.log("Topic============================", topic);

const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'kafkajs-3c49d217-344a-4cea-a015-3280781ca5e7' });

const start = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: topic, fromBeginning: true });

  console.log('Consumer started');

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.toString() || '';
      console.log('Received Kafka Message: ///////////////////////////////////////////', value);

      try {
        // await prisma.message.create({ data: { value } });
        console.log('Message stored in PostgreSQL');
      } catch (error) {
        console.error('Error storing message:', error);
      }
    },
  });
};

start().catch((error) => {
  console.error(`Error in worker for topic ${topic}:`, error);
  process.exit(1); // Exit on fatal error
});

process.on("SIGINT", async () => {
  console.log("Graceful shutdown");
  await consumer.disconnect();
  process.exit(0); // Exit successfully on SIGINT
});
