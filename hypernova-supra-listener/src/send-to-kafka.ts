import { Kafka } from "kafkajs";
import { KAFKA_BROKER } from "./config/dotenv";

const kafka = new Kafka({
    brokers: [KAFKA_BROKER],
});

const producer = kafka.producer();

export const sendToKafka = async (topic: string, key: string, data: string) => {
    await producer.connect();
    await producer.send({
        topic: topic,
        messages: [{ key: key, value: data }],
    })
}