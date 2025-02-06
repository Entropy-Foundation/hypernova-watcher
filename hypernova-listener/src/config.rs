use crate::types::Config;
use std::fs;
use toml;
use eyre::Result;

pub fn load_config(path: &str) -> Result<Config> {
    let config_content = fs::read_to_string(path)?;
    let config: Config = toml::from_str(&config_content)?;
    Ok(config)
}
