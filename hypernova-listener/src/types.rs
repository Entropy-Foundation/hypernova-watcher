use serde::Deserialize;

#[derive(Deserialize)]
pub struct Config {
    pub kafka: KafkaConfig,
    pub chains: Vec<ChainConfig>,
}

#[derive(Deserialize)]
pub struct KafkaConfig {
    pub brokers: String,
}

#[derive(Deserialize, Clone)]
pub struct ChainConfig {
    pub rpc_url: String,
    pub contract_address: String,
    pub event_name: String,
    pub kafka_topic: String,
}
