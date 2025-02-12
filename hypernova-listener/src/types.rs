use serde::Deserialize;

#[derive(Deserialize)]
pub struct Config {
    pub kafka: KafkaConfig,
    pub events: Vec<EventConfig>,
    pub txns: Vec<TxnConfig>,
}

#[derive(Deserialize)]
pub struct KafkaConfig {
    pub brokers: String,
}

#[derive(Deserialize, Clone, Debug)]
pub struct EventConfig {
    pub rpc_url: String,
    pub contract_address: String,
    pub event_name: String,
    pub kafka_topic: String,
}

#[derive(Deserialize, Clone, Debug)]
pub struct TxnConfig {
    pub rpc_url: String,
    pub contract_address: String,
    pub function_sig: String,
    pub kafka_topic: String,
}
