import { Kafka } from 'kafkajs';
import { KAFKA_BROKER, KAFKA_TOPICS } from './config/dotenv';
import { ethers } from 'ethers';
import { Repository } from 'redis-om';
import { sourceEventSchema } from './redis/schema';
import { redisClient } from './redis/client';

const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'kafkajs-3c49d217-344a-4cea-a015-3280781ca5e7' });
const sourceEventRepo = new Repository(sourceEventSchema, redisClient);
const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const structType = [
  "bytes32",
  "bytes32",
  "uint256",
  "bytes32",
  "uint64",
  "uint64",
  "bytes32",
  "uint256"
];

// Function to process Topic 1 messages
const processTopic1 = async (msgJson: any) => {
  const trimmedData = "0x" + msgJson.msgData.slice(130);
  const decoded = abiCoder.decode(structType, trimmedData);

  const eventData = {
    fromChainId: decoded[2].toString(),
    toChainId: msgJson.toChainId,
    amount: decoded[4].toString(),
    asset: typeof (decoded[1]) === 'string' ? decoded[1] : decoded[1].toString(),
    msgId: msgJson.msgId,
    receiverAddr: decoded[6],
    txHash: msgJson.txHash
  };
  try {
    await redisClient.connect();
    const postedEvent = await sourceEventRepo.save(eventData);
  } catch (error) {
    return error;
  }
  console.log('Message stored in PostgreSQL for Topic 1');

};

// Function to process Topic 2 messages
const processTopic2 = async (msgJson: any) => {
  try {
    console.log("Processing Topic 2 Message:", msgJson);

    // decode input data and store in redis 

    console.log("Message stored in PostgreSQL for Topic 2");
  } catch (error) {
    console.error("Error storing message for Topic 2:", error);
  }
};

// Kafka Consumer Start
export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: [KAFKA_TOPICS[0], KAFKA_TOPICS[1]], fromBeginning: true });

  console.log('Consumer started');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const msgString = message.value?.toString("utf-8");
      if (!msgString) return;

      try {
        const msgJson = JSON.parse(msgString);

        if (topic === KAFKA_TOPICS[0]) {
          await processTopic1(msgJson);
        } else if (topic === KAFKA_TOPICS[1]) {
          await processTopic2(msgJson);
        } else {
          console.warn(`Received message for unknown topic: ${topic}`);
        }
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