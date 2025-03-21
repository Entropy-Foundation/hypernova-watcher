import { Kafka } from 'kafkajs';
import { KAFKA_BROKER, KAFKA_TOPICS } from './config/dotenv';
import { ethers, keccak256 } from 'ethers';
import { redisClient } from './redis/client';
import { sendToKafka } from './kafka/send-to-kafka';

const kafka = new Kafka({ brokers: [KAFKA_BROKER] });
const consumer = kafka.consumer({ groupId: 'kafkajs-3c49d217-344a-4cea-a015-3280781ca5e7' });
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
    toChainId: msgJson.toChainId.toString(),
    amount: decoded[4].toString(),
    asset: decoded[1].toString(),
    receiverAddr: decoded[6].toString()
  };

  const eventHash = keccak256(abiCoder.encode(["string", "string", "string", "string", "string"], Object.values(eventData)))

  try {
    await redisClient.connect();
    await redisClient.set(`${msgJson.txHash}:srcEvent`, eventHash);
    await redisClient.set(`${msgJson.msgId}:destTx`, eventHash);
    const exists = await redisClient.exists(`${msgJson.txHash}:srcTx`);
    if (exists) {
      sendToKafka(KAFKA_TOPICS[3], "EVENT", msgJson.txHash);
    }
    redisClient.disconnect();

  } catch (error) {
    return error;
  }
};

// Function to process Topic 2 messages
const processTopic2 = async (msgJson: any, key: string) => {
  if (key === "45cbf507") { //func sig of sendNative
    const abi = ["function sendNative(bytes32 receiverAddr, bytes32 payload, uint256 toChainId)"];
    const iface = new ethers.Interface(abi);
    const decoded = iface.parseTransaction({ data: msgJson.input })

    const txData = {
      fromChainId: msgJson.sourceChainId.toString(),
      toChainId: decoded?.args[2].toString(),
      amount: msgJson.amount.toString(),
      asset: "0x3078333137343462393633643164383336373061373534463833323634466533", //"bytes32(WETHAddr)" need to take this from env
      receiverAddr: decoded?.args[0].toString()
    };

    const txHash = keccak256(abiCoder.encode(["string", "string", "string", "string", "string"], Object.values(txData)));

    try {
      await redisClient.connect();
      await redisClient.set(`${msgJson.txHash}:srcTx`, txHash);
      const exists = await redisClient.exists(`${msgJson.txHash}:srcEvent`);
      if (exists) {
        sendToKafka(KAFKA_TOPICS[3], "TXN", msgJson.txHash);
      }
      redisClient.disconnect();
    } catch (error) {
      return error;
    }

  } else if (key === "6e8e6932") { // func sig of sendTokens
    const abi = ["function sendTokens(address tokenAddr, uint64 amount, bytes32 receiverAddr, bytes32 payload, uint256 toChainId)"];
    const iface = new ethers.Interface(abi);
    const decoded = iface.parseTransaction({ data: msgJson.input })

    const txData = {
      fromChainId: msgJson.sourceChainId.toString(),
      toChainId: decoded?.args[4].toString(),
      amount: decoded?.args[1].toString(),
      asset: "0x3078333137343462393633643164383336373061373534463833323634466533", // "bytes32(decoded?.args[0])" 
      receiverAddr: decoded?.args[2].toString()
    }

    const txHash = keccak256(abiCoder.encode(["string", "string", "string", "string", "string"], Object.values(txData)));

    try {
      await redisClient.connect();
      await redisClient.set(`${msgJson.txHash}:srcTx`, txHash);
      const exists = await redisClient.exists(`${msgJson.txHash}:srcEvent`);
      if (exists) {
        sendToKafka(KAFKA_TOPICS[3], "TXN", msgJson.txHash);
      }
      redisClient.disconnect();
    } catch (error) {
      return error;
    }
  } else {
    console.warn("Received some other txn");
  }
};

// Kafka Consumer Start
export const startConsumer = async () => {
  await consumer.connect();
  await consumer.subscribe({ topics: [KAFKA_TOPICS[0], KAFKA_TOPICS[1]], fromBeginning: true });

  console.log('Consumer started');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      let key = message.key?.toString("utf-8");
      const msgString = message.value?.toString("utf-8");
      if (!msgString) return;

      try {
        const msgJson = JSON.parse(msgString);
        if (topic === KAFKA_TOPICS[0]) {
          await processTopic1(msgJson);
        } else if (topic === KAFKA_TOPICS[1]) {
          await processTopic2(msgJson, key || '');
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