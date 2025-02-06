mod config;
mod listener;
mod kafka;
mod types;
mod watcher;
use tokio::task;
use eyre::Result;

#[tokio::main]
async fn main() -> Result<()> {
    let config = config::load_config("./config/config.toml")?;
    let producer = kafka::create_producer(&config.kafka.brokers)?;

    println!("Listening for Ethereum events and sending to Kafka...");

    let mut handles = vec![];

    for chain in config.chains {
        let producer = producer.clone();
        let handle = task::spawn(listener::listen_to_chain(chain, producer));
        handles.push(handle);
    }

    for handle in handles {
        let _ = handle.await;
    }

    Ok(())
}
