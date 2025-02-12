use eyre::{eyre, Result};
use rdkafka::{
    config::ClientConfig,
    producer::{FutureProducer, FutureRecord},
};
use std::time::Duration;

pub fn create_producer(brokers: &str) -> Result<FutureProducer> {
    let producer: FutureProducer = ClientConfig::new()
        .set("bootstrap.servers", brokers)
        .create()
        .expect("Producer creation failed");
    Ok(producer)
}

pub async fn send_to_kafka(
    producer: &FutureProducer,
    topic: &str,
    key: &str,
    payload: &str,
) -> Result<()> {
    let record = FutureRecord::to(topic).key(key).payload(payload);

    match producer.send(record, Duration::from_secs(0)).await {
        Ok(_) => {
            println!("Message sent to Kafka");
            Ok(())
        }
        Err((e, _)) => {
            eprintln!("Failed to send message to Kafka: {}", e);
            Err(eyre!("Kafka send error: {}", e))
        }
    }
}
