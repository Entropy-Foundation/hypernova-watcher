const { Kafka } = require("kafkajs");

const kafka = new Kafka({
    clientId: "event-listener",
    brokers: ["localhost:9092"], // Change this to your Kafka broker(s)
});

const consumer = kafka.consumer({ groupId: "event-group" });

const run = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: "event-topic", fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            console.log(`Received message: ${message.value.toString()}`);
        },
    });
};

run().catch(console.error);