use rdkafka::{
    config::ClientConfig,
    producer::{FutureProducer, FutureRecord},
};
use std::time::Duration;
use eyre::Result;

pub fn create_producer(brokers: &str) -> Result<FutureProducer> {
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .create().expect("Producer creation failed");
    Ok(producer)
}

pub async fn send_to_kafka(producer: &FutureProducer, topic: &str, key: &str, payload: &str) {
    let record = FutureRecord::to(topic)
        .key(key)
        .payload(payload);

    match producer.send(record, Duration::from_secs(0)).await{
        Ok(_) => println!("Message sent to Kafka"),
        Err((e, _)) => eprintln!("Failed to send message to Kafka: {}", e),
    }
}
