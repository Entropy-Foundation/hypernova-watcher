import { Kafka } from 'kafkajs';
import prisma from './db/prismaClient';
import { KAFKA_BROKER } from './config/dotenv';
import { ethers } from 'ethers';
import { Status } from '@prisma/client';

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

const hexToBase64 = (hex: string) => {
  return Buffer.from(hex.replace(/^0x/, ""), "hex").toString("base64");
};

// Function to process Topic 1 messages
const processTopic1 = async (msgJson: any) => {
  const trimmedData = "0x" + msgJson.msgData.slice(130); 
  const decoded = abiCoder.decode(structType, trimmedData);
  const messageData = {
    senderAddr: decoded[0], 
    tokenAddress: decoded[1],
    sourceChainId: decoded[2].toString(),
    payload: decoded[3].toString(),
    amount: decoded[4].toString(),
    currentFee: decoded[5].toString(),
    receiverAddr: decoded[6],
    timestamp: decoded[7].toString(),
  };

  try {
    const SourceTx = await prisma.sourceTx.create({
      data: {
        txHash: msgJson.txHash,
        chainId: messageData.sourceChainId,
        toChainId: msgJson.toChainId,
        msgId: msgJson.msgId,
        asset: messageData.tokenAddress,
        amount: messageData.amount,
        senderAddr: messageData.senderAddr,
        receiverAddr: messageData.receiverAddr,
        block: msgJson.blockNumber,
      }
    });

    const TxData = await prisma.txData.create({
      data: {
        sourceTxHash: msgJson.txHash,
        status: Status.SENT,
        message: Buffer.from(hexToBase64(messageData.payload), 'base64'),
      }
    });

    if (!SourceTx || !TxData) {
      throw new Error('Failed to create SourceTx');
    }

    console.log('Message stored in PostgreSQL for Topic 1');
  } catch (error) {
    console.error('Error storing message for Topic 1:', error);
  }
};

// Function to process Topic 2 messages
const processTopic2 = async (msgJson: any) => {
  try {
    console.log("Processing Topic 2 Message:", msgJson);

    // Example logic for Topic 2 (Modify as needed)
    // await prisma.otherTx.create({
    //   data: {
    //     txHash: msgJson.txHash,
    //     someField: msgJson.someData, // Adjust based on Topic 2 structure
    //   }
    // });

    console.log("Message stored in PostgreSQL for Topic 2");
  } catch (error) {
    console.error("Error storing message for Topic 2:", error);
  }
};

// Kafka Consumer Start
const start = async () => {
  await consumer.connect();
await consumer.subscribe({ topics: ['KAFKA_TOPIC_1', 'KAFKA_TOPIC_2'], fromBeginning: true });

  console.log('Consumer started');

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      const msgString = message.value?.toString("utf-8");
      if (!msgString) return;

      try {
        const msgJson = JSON.parse(msgString);

        if (topic === 'KAFKA_TOPIC_1') {
          await processTopic1(msgJson);
        } else if (topic === 'KAFKA_TOPIC_2') {
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

start().catch((error) => {
  console.error(`Error in Kafka consumer:`, error);
  process.exit(1); // Exit on fatal error
});

process.on("SIGINT", async () => {
  console.log("Graceful shutdown");
  await consumer.disconnect();
  process.exit(0);
});