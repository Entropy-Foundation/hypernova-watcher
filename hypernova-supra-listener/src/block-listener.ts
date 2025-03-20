import cron from "node-cron";
import { sendToKafka } from "./send-to-kafka";
import { EVENT_TYPE, BASE_URL, KAFKA_TOPICS } from "./config/dotenv";

const MAX_NUM_OF_BLOCK_QUERY = 10;
let lastEndBlock: number | null = null;

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
    const blockUrl = `${BASE_URL}/rpc/v1/block`;

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
        const eventUrl = `${BASE_URL}/rpc/v1/events/${encodeURIComponent(EVENT_TYPE)}?start=${startBlock}&end=${endBlock}`;

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
            await sendToKafka(KAFKA_TOPICS[2], "EVENT", JSON.stringify(data.data[0]?.data));
        } catch (error) {
            console.error("Fetch error:", error);
        }
    }
};

cron.schedule("*/4 * * * * *", () => {
    getEventData()
});
