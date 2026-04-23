use serde::{Deserialize, Serialize};
use tauri::command;
use std::net::IpAddr;
use url::Url;
use std::env;

fn validate_url(url: &str) -> Result<Url, String> {
    let parsed = Url::parse(url).map_err(|e| format!("Invalid URL: {}", e))?;
    if parsed.scheme() != "http" && parsed.scheme() != "https" {
        return Err("URL must use http or https scheme".to_string());
    }
    
    #[cfg(not(debug_assertions))]
    {
        if parsed.scheme() == "http" {
            return Err("Production builds require HTTPS. HTTP connections are not allowed.".to_string());
        }
    }
    
    #[cfg(debug_assertions)]
    {
        if parsed.scheme() == "http" {
            log::warn!("Using insecure HTTP connection. Consider using HTTPS.");
        }
    }
    Ok(parsed)
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RouterStatus {
    pub wan_ip: Option<String>,
    pub clients: u16,
    pub vpn_active: bool,
    pub ap_ssid: String,
    pub signal_rssi: i16,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct WifiSettings {
    pub ssid: String,
    pub password: String,
    pub channel: u8,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct VpnSettings {
    pub provider: String,
    pub config: String,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct NetworkStats {
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub rx_rate: u64,
    pub tx_rate: u64,
    pub wan_uptime: u32,
    pub cpu_usage: f32,
    pub memory_usage: f32,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ClientDevice {
    pub mac: String,
    pub ip: String,
    pub hostname: Option<String>,
    pub name: Option<String>,
    pub connected_at: u32,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
    pub blocked: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FirewallRule {
    pub id: String,
    pub port: u16,
    pub protocol: String,
    pub action: String,
    pub source_ip: Option<String>,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PortForward {
    pub id: String,
    pub external_port: u16,
    pub internal_ip: String,
    pub internal_port: u16,
    pub protocol: String,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GuestNetwork {
    pub ssid: String,
    pub password: String,
    pub enabled: bool,
    pub isolated: bool,
    pub max_clients: u8,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RouterLog {
    pub timestamp: u32,
    pub level: String,
    pub source: String,
    pub message: String,
}

#[command]
async fn fetch_wifi_settings(url: String, token: String) -> Result<WifiSettings, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/wifi", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<WifiSettings>().await.map_err(|e| e.to_string())
}

#[command]
async fn save_wifi_settings(url: String, token: String, settings: WifiSettings) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .put(&format!("{}/api/wifi", url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&settings)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to save WiFi settings: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn fetch_vpn_settings(url: String, token: String) -> Result<VpnSettings, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/vpn", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<VpnSettings>().await.map_err(|e| e.to_string())
}

#[command]
async fn save_vpn_settings(url: String, token: String, settings: VpnSettings) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .put(&format!("{}/api/vpn", url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&settings)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to save VPN settings: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn toggle_vpn(url: String, token: String, enabled: bool) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let vpn_url = format!("{}/api/vpn/toggle?enabled={}", url, enabled);
    let res = client
        .post(&vpn_url)
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to toggle VPN: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn fetch_status(url: String, token: String) -> Result<RouterStatus, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/status", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<RouterStatus>().await.map_err(|e| e.to_string())
}

#[command]
async fn save_credentials(url: String, token: String) -> Result<(), String> {
    validate_url(&url)?;
    let entry = keyring::Entry::new("travel-router", &url).map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())
}

#[command]
async fn get_credentials(url: String) -> Result<String, String> {
    validate_url(&url)?;
    let entry = keyring::Entry::new("travel-router", &url).map_err(|e| e.to_string())?;
    entry.get_password().map_err(|e| e.to_string())
}

#[command]
async fn discover_devices() -> Vec<String> {
    if let Ok(daemon) = mdns_sd::ServiceDaemon::new() {
        if let Ok(browser) = daemon.browse("_http._tcp.local.") {
            let mut devices: Vec<String> = Vec::new();
            while let Ok(event) = browser.recv_timeout(std::time::Duration::from_millis(500)) {
                if let mdns_sd::ServiceEvent::ServiceResolved(info) = event {
                    let addrs: Vec<&IpAddr> = info.get_addresses().iter().collect();
                    if let Some(addr) = addrs.first() {
                        devices.push(addr.to_string());
                    }
                }
            }
            if devices.is_empty() {
                return vec!["192.168.1.1".to_string()];
            }
            return devices;
        }
    }
    vec!["192.168.1.1".to_string()]
}

#[command]
async fn fetch_network_stats(url: String, token: String) -> Result<NetworkStats, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/network/stats", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<NetworkStats>().await.map_err(|e| e.to_string())
}

#[command]
async fn fetch_clients(url: String, token: String) -> Result<Vec<ClientDevice>, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/clients", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<Vec<ClientDevice>>().await.map_err(|e| e.to_string())
}

#[command]
async fn block_client(url: String, token: String, mac: String, blocked: bool) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("{}/api/clients/{}/block?blocked={}", url, mac, blocked))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to block/unblock client: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn rename_client(url: String, token: String, mac: String, name: String) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .put(&format!("{}/api/clients/{}/name", url, mac))
        .header("Authorization", format!("Bearer {}", token))
        .json(&serde_json::json!({ "name": name }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to rename client: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn fetch_firewall_rules(url: String, token: String) -> Result<Vec<FirewallRule>, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/firewall", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<Vec<FirewallRule>>().await.map_err(|e| e.to_string())
}

#[command]
async fn add_firewall_rule(url: String, token: String, rule: FirewallRule) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("{}/api/firewall", url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&rule)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to add firewall rule: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn delete_firewall_rule(url: String, token: String, rule_id: String) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .delete(&format!("{}/api/firewall/{}", url, rule_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to delete firewall rule: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn fetch_port_forwards(url: String, token: String) -> Result<Vec<PortForward>, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/portforward", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<Vec<PortForward>>().await.map_err(|e| e.to_string())
}

#[command]
async fn add_port_forward(url: String, token: String, forward: PortForward) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .post(&format!("{}/api/portforward", url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&forward)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to add port forward: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn delete_port_forward(url: String, token: String, forward_id: String) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .delete(&format!("{}/api/portforward/{}", url, forward_id))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to delete port forward: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn fetch_guest_network(url: String, token: String) -> Result<GuestNetwork, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/guest", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<GuestNetwork>().await.map_err(|e| e.to_string())
}

#[command]
async fn save_guest_network(url: String, token: String, settings: GuestNetwork) -> Result<(), String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .put(&format!("{}/api/guest", url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&settings)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err(format!("Failed to save guest network: {}", res.status()));
    }
    Ok(())
}

#[command]
async fn fetch_logs(url: String, token: String, limit: u16) -> Result<Vec<RouterLog>, String> {
    validate_url(&url)?;
    let client = reqwest::Client::new();
    let res = client
        .get(&format!("{}/api/logs?limit={}", url, limit))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    res.json::<Vec<RouterLog>>().await.map_err(|e| e.to_string())
}

#[command]
async fn ping_router(url: String, token: String) -> Result<u32, String> {
    validate_url(&url)?;
    let start = std::time::Instant::now();
    let client = reqwest::Client::new();
    let _ = client
        .get(&format!("{}/api/ping", url))
        .header("Authorization", format!("Bearer {}", token))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let elapsed = start.elapsed().as_millis() as u32;
    Ok(elapsed)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            fetch_status,
            save_credentials,
            get_credentials,
            discover_devices,
            fetch_wifi_settings,
            save_wifi_settings,
            fetch_vpn_settings,
            save_vpn_settings,
            toggle_vpn,
            fetch_network_stats,
            fetch_clients,
            block_client,
            rename_client,
            fetch_firewall_rules,
            add_firewall_rule,
            delete_firewall_rule,
            fetch_port_forwards,
            add_port_forward,
            delete_port_forward,
            fetch_guest_network,
            save_guest_network,
            fetch_logs,
            ping_router
        ])
        .setup(|app| {
            let _ = app.handle().plugin(tauri_plugin_http::init());
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}