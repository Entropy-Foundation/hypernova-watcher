import { startConsumer as startEthConsumer } from "./ethConsumer";
import { startConsumer as startSupraConsumer } from "./supraConsumer";

const start = async () => {
  console.log("Starting Kafka consumers...");

  try {
    await Promise.all([
      startEthConsumer().catch((error) => {
        console.error(`Error starting ETH consumer`, error);
      }),
      startSupraConsumer().catch((error) => {
        console.error(`Error starting Supra consumer`, error);
      }),
    ]);
  } catch (error) {
    console.error("Error in Kafka consumer initialization:", error);
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
