import { Kafka } from 'kafkajs';
import prisma from './db/prismaClient';
import { KAFKA_BROKER } from './config/dotenv';
import { ethers } from 'ethers';
import { Status } from '@prisma/client';

const topic = process.argv[2];
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

const start = async () => {
  await consumer.connect();
  await consumer.subscribe({ topic: topic, fromBeginning: true });

  console.log('Consumer started');

  await consumer.run({
    eachMessage: async ({ message }) => {

      const msgString = message.value?.toString("utf-8");
      const msgJson = JSON.parse(msgString || "");
      const trimmedData = "0x" + msgJson.msgData.slice(130); 
      const decoded = abiCoder.decode(structType, trimmedData);
      const messageData = {
        senderAddr: decoded[0], // Keep as hex
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
            asset:messageData.tokenAddress,
            amount:messageData.amount,
            senderAddr:messageData.senderAddr,
            receiverAddr:messageData.receiverAddr,
            block:msgJson.blockNumber,
        }
      });

      const TxData = await prisma.txData.create({
        data: {
          sourceTxHash: msgJson.txHash,
          status: Status.SENT,
          message:  Buffer.from(hexToBase64(messageData.payload), 'base64'),
        }
      });

        if (!SourceTx || !TxData) {
          throw new Error('Failed to create SourceTx');
        }
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
