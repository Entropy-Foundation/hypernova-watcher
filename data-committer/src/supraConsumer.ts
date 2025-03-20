import { Kafka } from 'kafkajs';
import { redisClient } from './redis/client';
import { KAFKA_BROKER, KAFKA_TOPICS } from './config/dotenv';
import { ethers, keccak256 } from 'ethers';


const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'kafkajs-34e56299-8197-4523-801f-9c28abff04b6' });
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

const processEvent = async (msgJson: any) => {
  try {
    console.log("Processing Topic 3 Message:", msgJson);
    await redisClient.connect();
    const eventData = {
      fromChainId: msgJson.fromChainId.toString(),
      toChainId: msgJson.toChainId.toString(),
      amount: msgJson.amount.toString(),
      asset: msgJson.asset.toString(),
      receiverAddr: msgJson.receiverAddr.toString()
    };

    const eventHash = keccak256(abiCoder.encode(["string", "string", "string", "string", "string"], Object.values(eventData)))

    await redisClient.set(`${msgJson.msgId}:destEvent`, eventHash);
    redisClient.disconnect();
  } catch (error) {
    console.error("Error storing message for Topic 3:", error);
  }
};

export const startConsumer = async () => {
  consumer.connect();
  await consumer.subscribe({ topics: [KAFKA_TOPICS[2]], fromBeginning: true });

  console.log('Consumer started.............');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const msgString = message.value?.toString("utf-8");
      if (!msgString) return;

      try {
        const msgJson = JSON.parse(msgString);
        await processEvent(msgJson);
      } catch (error) {
        console.error(`Error processing message for topic ${topic}:`, error);
      }
    },
  });
};


startConsumer().catch((error) => {
  console.error(`Error in Kafka consumer:`, error);
  process.exit(1); // Exit on fatal error
});

process.on("SIGINT", async () => {
  console.log("Graceful shutdown");
  await consumer.disconnect();
  process.exit(0);
});