import { Kafka } from 'kafkajs';
import { KAFKA_BROKER, KAFKA_TOPICS } from './config/dotenv';

const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'kafkajs-3c49d217-344a-4cea-a015-3280781ca5e7' });

export const startConsumer = async () => {
    consumer.connect();
    await consumer.subscribe({ topics: [KAFKA_TOPICS[2]], fromBeginning: true });

    console.log('Consumer started');

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        const msgString = message.value?.toString("utf-8");
        if (!msgString) return;

        try {
          const msgJson = JSON.parse(msgString);
          console.log("Processing Topic 3 Message:", msgJson);
        } catch (error) {
          console.error(`Error processing message for topic ${topic}:`, error);
        }
      },
    });
}


startConsumer().catch((error) => {
  console.error(`Error in Kafka consumer:`, error);
  process.exit(1); // Exit on fatal error
});

process.on("SIGINT", async () => {
  console.log("Graceful shutdown");
  await consumer.disconnect();
  process.exit(0);
});