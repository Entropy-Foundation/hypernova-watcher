use std::str::FromStr;

use crate::kafka;
use crate::types::ChainConfig;
use alloy::{
    primitives::Address,
    providers::{Provider, ProviderBuilder, WsConnect},
    rpc::types::{BlockNumberOrTag, Filter},
};
use eyre::Result;
use futures_util::stream::StreamExt;
use rdkafka::producer::FutureProducer;

pub async fn listen_to_chain(chain: ChainConfig, producer: FutureProducer) -> Result<(), eyre::Report> {
    println!("Connecting to {}", chain.rpc_url);

    let ws = WsConnect::new(&chain.rpc_url);
    let provider = ProviderBuilder::new().on_ws(ws).await?;

    // Create the filter
    let address = Address::from_str(&chain.contract_address)?;
    let filter = Filter::new()
        .address(address)
        .event(&chain.event_name.as_str())
        .from_block(BlockNumberOrTag::Latest);

    // Subscribe to logs
    let sub = provider.subscribe_logs(&filter).await?;
    let mut stream = sub.into_stream();

    println!(
        "Listening for events: {} on {}",
        chain.event_name, &chain.rpc_url
    );

    while let Some(log) = stream.next().await {
        let log_data = format!("{:?}", log);
        println!("New Event [{}]: {}", chain.event_name, log_data);

        kafka::send_to_kafka(&producer, &chain.kafka_topic, &chain.event_name, &log_data).await;
    }

    Ok(())
}