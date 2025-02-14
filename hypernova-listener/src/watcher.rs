use crate::kafka;
use crate::types::TxnConfig;
use alloy::eips::BlockId;
use alloy::network::primitives::BlockTransactionsKind;
use alloy::primitives::Address;
use alloy::{
    consensus::Transaction,
    providers::{Provider, ProviderBuilder, WsConnect},
};
use eyre::Result;
use futures_util::StreamExt;
use rdkafka::producer::FutureProducer;
use std::str::FromStr;

pub async fn watch_txn(txn: TxnConfig, producer: FutureProducer) -> Result<(), eyre::Report> {
    println!("Watching Txns on {}", txn.rpc_url);
    let txn_data = format!("{:?}", txn);
    println!("Txn config {}", txn_data);

    // Define the contract address you want to filter
    let contract_address = Address::from_str(&txn.contract_address)?;

    let ws = WsConnect::new(&txn.rpc_url);
    let provider = ProviderBuilder::new().on_ws(ws).await?;

    let mut block_stream = provider.subscribe_blocks().await?.into_stream();

    println!("Listening for new blocks...");

    while let Some(block) = block_stream.next().await {
        let block_number = block.number;
        println!("New Block: {}", block_number);
        process_block(
            &provider,
            block_number,
            contract_address,
            txn.clone(),
            producer.clone(),
        )
        .await?;
    }
    Ok(())
}
async fn process_block<P: Provider>(
    provider: &P,
    block_number: u64,
    contract: Address,
    txn: TxnConfig,
    producer: FutureProducer,
) -> Result<()> {
    if let Some(block) = provider
        .get_block(BlockId::from(block_number), BlockTransactionsKind::Full)
        .await?
    {
        for tx in block.transactions.txns() {
            if let Some(to) = tx.to() {
                if to == contract {
                    if let Some(receipt) = provider
                        .get_transaction_receipt(*tx.inner.tx_hash())
                        .await?
                    {
                        if receipt.status() == true {
                            println!(
                                "Executed Txn: {:?} in Block {}",
                                &tx.inner.tx_hash(),
                                block_number
                            );
                            if let Err(e) = kafka::send_to_kafka(
                                &producer,
                                &txn.kafka_topic,
                                &txn.function_sig,
                                &tx.input().to_string(),
                            )
                            .await
                            {
                                println!("Error sending kafka to Kafka: {:?}", e);
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(())
}
