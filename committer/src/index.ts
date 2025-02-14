import { fork } from "child_process";

const topics = ["KAFKA_TOPIC_1"]; // Add more topics as needed

topics.forEach((topic) => {
  const worker = fork("./dist/consumer.js", [topic]);

  worker.on("exit", (code) => {
    console.log(`Worker for ${topic} exited with code ${code}`);
  });
});
