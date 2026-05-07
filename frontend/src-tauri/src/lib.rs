use std::net::IpAddr;
use tauri::command;

#[command]
async fn save_credentials(url: String, token: String) -> Result<(), String> {
    let entry = keyring::Entry::new("travel-router", &url).map_err(|e| e.to_string())?;
    entry.set_password(&token).map_err(|e| e.to_string())
}

#[command]
async fn get_credentials(url: String) -> Result<String, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_credentials,
            get_credentials,
            discover_devices,
        ])
        .setup(|app| {
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
