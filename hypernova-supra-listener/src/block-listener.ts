import cron from "node-cron";
import { Kafka } from "kafkajs";

const MAX_NUM_OF_BLOCK_QUERY = 10;
let lastEndBlock: number | null = null;
const topic = "KAFKA_TOPIC_2";

const kafka = new Kafka({
    brokers: ["kafka:9092"], // Replace with your Kafka broker
});

const producer = kafka.producer();

interface BlockResponse {
    author: string;
    hash: string;
    height: number;
    parent: string;
    timestamp: {
        microseconds_since_unix_epoch: number;
        utc_date_time: string;
    };
    view: {
        epoch_id: { chain_id: number; epoch: number };
        round: number;
    };
}

const sendToKafka = async (data: string) => {
    await producer.connect();
    await producer.send({
        topic: topic,
        messages: [{ value: data }],
    })
}

const fetchData = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return await response.json() as T;
    } catch (error) {
        console.error("Fetch error:", error);
        throw new Error("Failed to fetch data");
    }
};

const getLatestBlockHeight = async () => {
    const blockUrl = "https://rpc-devnetbridge.supra.com/rpc/v1/block";

    try {
        const response = await fetchData<BlockResponse>(blockUrl, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (response) {
            const blockHeight: number = response.height;
            return blockHeight;
        } else {
            console.log("No height found in response");
            return null;
        }
    } catch (error) {
        console.error("Error fetching block height:", error);
    }
};

const getEventData = async () => {
    let endBlock: number | null | undefined = await getLatestBlockHeight();

    if (typeof endBlock === "number") {
        let startBlock = lastEndBlock ? lastEndBlock : endBlock - MAX_NUM_OF_BLOCK_QUERY;
        lastEndBlock = endBlock;  // Store endBlock for next iteration

        console.log(`Querying from block ${startBlock} to ${endBlock}`);

        const baseUrl = "https://rpc-devnetbridge.supra.com/rpc/v1/events";
        const eventType = "0x53a0f5d5cf5105bec62831ee67ffd0583751a1a37c67b75c1d00bff176e27eec::Event::MessageEvent";
        const functionType = "0x53a0f5d5cf5105bec62831ee67ffd0583751a1a37c67b75c1d00bff176e27eec::Event::post_message";
        const eventUrl = `${baseUrl}/${encodeURIComponent(eventType)}?start=${startBlock}&end=${endBlock}`;

        try {
            const response = await fetch(eventUrl, { method: "GET" });
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            if (Array.isArray(data?.data) && data.data.length === 0) {
                console.log("No new events.");
                return;
            }

            console.log("Processing event at block:", data?.data[0]?.data.block_height);

            const blockNumber = data?.data[0]?.data.block_height;
            const blockDetailsUrl = `https://rpc-devnetbridge.supra.com/rpc/v2/block/height/${blockNumber}?with_finalized_transactions=true`;

            try {
                const blockResponse = await fetch(blockDetailsUrl, { method: "GET" });
                const blockData = await blockResponse.json();
                blockData.transactions.forEach((tx: any) => {
                    if (tx.payload?.Move?.function === functionType) {
                        const events = tx.output?.Move?.events;
                        events.forEach((event: any) => {
                            if (event.type === eventType) {
                                sendToKafka(JSON.stringify(event.data));
                            }
                        });
                    }
                });
            } catch (error) {
                console.error("Error fetching block details:", error);
            }

        } catch (error) {
            console.error("Fetch error:", error);
        }
    }
};

cron.schedule("*/5 * * * * *", () => {
    getEventData()
});
