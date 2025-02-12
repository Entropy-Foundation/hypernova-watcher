mod config;
mod listener;
mod kafka;
mod types;
mod watcher;
use tokio::task;
use eyre::Result;

use tokio::join;

#[tokio::main]
async fn main() -> Result<()> {
    let config = config::load_config("./config/config.toml")?;
    let producer = kafka::create_producer(&config.kafka.brokers)?;

    println!("Listening for Ethereum events and sending to Kafka...");

    let event_handles: Vec<_> = config.events.into_iter()
        .map(|event| {
            let producer = producer.clone();
            task::spawn(listener::listen_to_chain(event, producer))
        })
        .collect();

    let txn_handles: Vec<_> = config.txns.into_iter()
        .map(|txn| {
            let producer = producer.clone();
            task::spawn(watcher::watch_txn(txn, producer))
        })
        .collect();

    // Run both event and txn handlers concurrently
    let _ = join!(
        async { for handle in event_handles { let _ = handle.await; } },
        async { for handle in txn_handles { let _ = handle.await; } }
    );

    Ok(())
}
