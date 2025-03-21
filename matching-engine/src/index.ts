import { startMatchingEngine } from "./matchingEngine";

const start = async () => {
  console.log("Starting Kafka Supra consumer...");

  try {
    await startMatchingEngine();
    console.log("Supra consumer started.");
  } catch (error) {
    console.error("Error starting Supra consumer:", error);
    process.exit(1);
  }
};

start().catch((error) => {
  console.error("Error in Kafka consumer initialization:", error);
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("Graceful shutdown");
  process.exit(0);
});