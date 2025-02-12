use std::str::FromStr;
use std::time::Duration;

use crate::kafka;
use crate::types::EventConfig;
use alloy::{
    primitives::Address,
    providers::{Provider, ProviderBuilder, WsConnect},
    rpc::types::{BlockNumberOrTag, Filter},
};
use eyre::Result;
use futures_util::stream::StreamExt;
use rdkafka::producer::FutureProducer;
use tokio::time::sleep;

pub async fn listen_to_chain(event: EventConfig, producer: FutureProducer) -> Result<(), eyre::Report> {
    loop {
        println!("Connecting to {}", event.rpc_url);

        let ws = WsConnect::new(&event.rpc_url);
        match ProviderBuilder::new().on_ws(ws).await {
            Ok(provider) => {
                let address = Address::from_str(&event.contract_address)?;
                let filter = Filter::new()
                    .address(address)
                    .event(&event.event_name.as_str())
                    .from_block(BlockNumberOrTag::Latest);

                match provider.subscribe_logs(&filter).await {
                    Ok(sub) => {
                        let mut stream = sub.into_stream();

                        println!(
                            "Listening for events: {} on {}",
                            event.event_name, &event.rpc_url
                        );

                        while let Some(log) = stream.next().await {
                            let log_data = format!("{:?}", log.inner.data.data);
                            println!("New Event [{}]: {}", event.event_name, log_data);

                            if let Err(e) = kafka::send_to_kafka(&producer, &event.kafka_topic, &event.event_name, &log_data).await {
                                eprintln!("Failed to send to Kafka: {:?}", e);
                            }
                        }
                    }
                    Err(e) => eprintln!("Subscription error: {:?}. Retrying...", e),
                }
            }
            Err(e) => eprintln!("Provider connection error: {:?}. Retrying...", e),
        }

        // Wait before retrying connection
        println!("Reconnecting in 5 seconds...");
        sleep(Duration::from_secs(5)).await;
    }
}
