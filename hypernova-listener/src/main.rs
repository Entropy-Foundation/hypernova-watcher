mod config;
mod kafka;
mod listener;
mod types;
use alloy::primitives::Address;
use eyre::Result;
use std::str::FromStr;
use tokio::join;
use tokio::task;

#[tokio::main]
async fn main() -> Result<()> {
    let config = config::load_config("./config/config.toml")?;
    let producer = kafka::create_producer(&config.kafka.brokers)?;

    println!("Listening for Ethereum events and sending to Kafka...");

    let event_handles: Vec<_> = config
        .events
        .into_iter()
        .map(|event| {
            let producer = producer.clone();
            task::spawn(listener::listen_to_chain(event, producer))
        })
        .collect();



    // Run both event and txn handlers concurrently
    let _ = join!(
        async {
            for handle in event_handles {
                let _ = handle.await;
            }
        }
    );

    Ok(())
}
