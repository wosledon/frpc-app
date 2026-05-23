use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{Manager, State};
use tokio::process::Command;
use tokio::sync::Mutex as TokioMutex;

/// 应用状态管理
struct AppState {
    frpc_process: TokioMutex<Option<tokio::process::Child>>,
    is_running: AtomicBool,
    config_path: Mutex<PathBuf>,
    binary_path: Mutex<PathBuf>,
}

/// frps 服务器配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrpsConfig {
    pub server_addr: String,
    pub server_port: u16,
    pub auth_token: String,
}

/// 代理配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub name: String,
    pub r#type: String, // tcp, udp, stcp, http, https
    pub local_ip: String,
    pub local_port: u16,
    pub remote_port: Option<u16>,
    pub custom_domains: Option<Vec<String>>,
}

/// 完整配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrpcConfig {
    pub frps: FrpsConfig,
    pub proxies: Vec<ProxyConfig>,
}

/// 下载进度
#[derive(Debug, Clone, Serialize)]
pub struct DownloadProgress {
    pub current: u64,
    pub total: u64,
    pub percentage: f64,
}

/// 获取应用数据目录
fn get_app_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    Ok(app_dir)
}

/// 获取 frpc 二进制路径
fn get_binary_path(app_dir: &PathBuf) -> PathBuf {
    let binary_name = if cfg!(target_os = "windows") {
        "frpc.exe"
    } else {
        "frpc"
    };
    app_dir.join(binary_name)
}

/// 获取配置文件路径
fn get_config_path(app_dir: &PathBuf) -> PathBuf {
    app_dir.join("frpc.toml")
}

/// 获取当前平台标识
fn get_platform_identifier() -> Result<&'static str, String> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    match (os, arch) {
        ("windows", "x86_64") => Ok("windows_amd64"),
        ("windows", "x86") => Ok("windows_386"),
        ("windows", "aarch64") => Ok("windows_arm64"),
        ("macos", "x86_64") => Ok("darwin_amd64"),
        ("macos", "aarch64") => Ok("darwin_arm64"),
        ("linux", "x86_64") => Ok("linux_amd64"),
        ("linux", "x86") => Ok("linux_386"),
        ("linux", "aarch64") => Ok("linux_arm64"),
        _ => Err(format!("不支持的平台: {} {}", os, arch)),
    }
}

/// 从 GitHub Releases 下载 frpc 二进制
#[tauri::command]
async fn download_frpc(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = get_app_dir(&app_handle)?;
    let binary_path = get_binary_path(&app_dir);

    // 获取最新 release
    let client = reqwest::Client::new();
    let release_url = "https://api.github.com/repos/fatedier/frp/releases/latest";

    let response = client
        .get(release_url)
        .header("User-Agent", "frpc-app")
        .send()
        .await
        .map_err(|e| format!("获取 release 信息失败: {}", e))?;

    let release: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("解析 release 信息失败: {}", e))?;

    let version = release["tag_name"]
        .as_str()
        .ok_or("无法获取版本号")?
        .to_string();

    let platform = get_platform_identifier()?;

    // Windows 用 .zip，其他平台用 .tar.gz
    let is_windows = cfg!(target_os = "windows");
    let ext = if is_windows { "zip" } else { "tar.gz" };
    let asset_name = format!("frp_{}_{}.{}", &version[1..], platform, ext);

    // 查找对应的 asset
    let assets = release["assets"].as_array().ok_or("无法获取 assets 列表")?;

    let asset = assets
        .iter()
        .find(|a| a["name"].as_str() == Some(&asset_name))
        .ok_or(format!(
            "未找到适用于 {} 的 frpc 二进制 ({})",
            platform, asset_name
        ))?;

    let download_url = asset["browser_download_url"]
        .as_str()
        .ok_or("无法获取下载链接")?;

    // 下载文件
    let response = client
        .get(download_url)
        .send()
        .await
        .map_err(|e| format!("下载失败: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取下载内容失败: {}", e))?;

    // 解压并提取 frpc 二进制
    let binary_name = if is_windows { "frpc.exe" } else { "frpc" };
    let version_dir = format!("frp_{}_{}", &version[1..], platform);

    if is_windows {
        // 解压 zip
        let reader = std::io::Cursor::new(bytes.as_ref());
        let mut archive =
            zip::ZipArchive::new(reader).map_err(|e| format!("打开 zip 失败: {}", e))?;

        // 在 zip 中查找 frpc.exe
        let mut found = false;
        for i in 0..archive.len() {
            let mut file = archive
                .by_index(i)
                .map_err(|e| format!("读取 zip 条目失败: {}", e))?;
            let name = file.name().to_string();
            // 匹配 frp_xxx_xxx/frpc.exe
            if name.ends_with(binary_name) && name.contains(&version_dir) {
                let mut out = Vec::new();
                std::io::Read::read_to_end(&mut file, &mut out)
                    .map_err(|e| format!("读取文件内容失败: {}", e))?;
                tokio::fs::write(&binary_path, &out)
                    .await
                    .map_err(|e| format!("写入 frpc 失败: {}", e))?;
                found = true;
                break;
            }
        }
        if !found {
            return Err("zip 中未找到 frpc.exe".to_string());
        }
    } else {
        // 解压 tar.gz
        let gz_decoder = flate2::read::GzDecoder::new(bytes.as_ref());
        let mut archive = tar::Archive::new(gz_decoder);

        let mut found = false;
        for entry in archive
            .entries()
            .map_err(|e| format!("读取 tar 条目失败: {}", e))?
        {
            let mut entry = entry.map_err(|e| format!("读取 tar 条目失败: {}", e))?;
            let path = entry
                .path()
                .map_err(|e| format!("获取路径失败: {}", e))?
                .to_string_lossy()
                .to_string();
            if path.ends_with(binary_name) && path.contains(&version_dir) {
                let mut out = Vec::new();
                std::io::Read::read_to_end(&mut entry, &mut out)
                    .map_err(|e| format!("读取文件内容失败: {}", e))?;
                tokio::fs::write(&binary_path, &out)
                    .await
                    .map_err(|e| format!("写入 frpc 失败: {}", e))?;
                found = true;
                break;
            }
        }
        if !found {
            return Err("tar.gz 中未找到 frpc".to_string());
        }

        // Linux/macOS 设置执行权限
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let _ = std::fs::set_permissions(&binary_path, std::fs::Permissions::from_mode(0o755));
        }
    }

    Ok(format!("下载成功: {}", version))
}

/// 启动 frpc 进程
#[tauri::command]
async fn start_frpc(
    state: State<'_, AppState>,
    _app_handle: tauri::AppHandle,
) -> Result<String, String> {
    if state.is_running.load(Ordering::SeqCst) {
        return Err("frpc 已经在运行中".to_string());
    }

    let binary_path = state.binary_path.lock().unwrap().clone();
    let config_path = state.config_path.lock().unwrap().clone();

    if !binary_path.exists() {
        return Err("frpc 二进制文件不存在，请先下载".to_string());
    }

    if !config_path.exists() {
        return Err("frpc.toml 配置文件不存在".to_string());
    }

    // 启动 frpc 进程
    let child = Command::new(&binary_path)
        .arg("-c")
        .arg(&config_path)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("启动 frpc 失败: {}", e))?;

    state.is_running.store(true, Ordering::SeqCst);
    *state.frpc_process.lock().await = Some(child);

    Ok("frpc 启动成功".to_string())
}

/// 停止 frpc 进程
#[tauri::command]
async fn stop_frpc(state: State<'_, AppState>) -> Result<String, String> {
    if !state.is_running.load(Ordering::SeqCst) {
        return Err("frpc 未运行".to_string());
    }

    let mut process_guard = state.frpc_process.lock().await;
    if let Some(mut child) = process_guard.take() {
        // 尝试优雅关闭
        #[cfg(target_os = "windows")]
        {
            // Windows 使用 taskkill
            let _ = Command::new("taskkill")
                .args(["/F", "/PID", &child.id().unwrap_or(0).to_string()])
                .spawn();
        }

        #[cfg(not(target_os = "windows"))]
        {
            let _ = child.kill().await;
        }

        let _ = child.wait().await;
    }

    state.is_running.store(false, Ordering::SeqCst);
    Ok("frpc 已停止".to_string())
}

/// 获取 frpc 运行状态
#[tauri::command]
async fn get_frpc_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let is_running = state.is_running.load(Ordering::SeqCst);
    let pid = if is_running {
        state
            .frpc_process
            .lock()
            .await
            .as_ref()
            .and_then(|c| c.id())
    } else {
        None
    };

    Ok(serde_json::json!({
        "is_running": is_running,
        "pid": pid
    }))
}

/// 保存配置
#[tauri::command]
async fn save_config(state: State<'_, AppState>, config: FrpcConfig) -> Result<String, String> {
    let config_path = state.config_path.lock().unwrap().clone();

    let toml_string =
        toml::to_string_pretty(&config).map_err(|e| format!("序列化配置失败: {}", e))?;

    tokio::fs::write(&config_path, toml_string)
        .await
        .map_err(|e| format!("保存配置文件失败: {}", e))?;

    Ok("配置已保存".to_string())
}

/// 加载配置
#[tauri::command]
async fn load_config(state: State<'_, AppState>) -> Result<FrpcConfig, String> {
    let config_path = state.config_path.lock().unwrap().clone();

    if !config_path.exists() {
        // 返回默认配置
        return Ok(FrpcConfig {
            frps: FrpsConfig {
                server_addr: "127.0.0.1".to_string(),
                server_port: 7000,
                auth_token: "".to_string(),
            },
            proxies: vec![],
        });
    }

    let content = tokio::fs::read_to_string(&config_path)
        .await
        .map_err(|e| format!("读取配置文件失败: {}", e))?;

    let config: FrpcConfig =
        toml::from_str(&content).map_err(|e| format!("解析配置文件失败: {}", e))?;

    Ok(config)
}

/// 导入配置（从文件）
#[tauri::command]
async fn import_config(state: State<'_, AppState>, file_path: String) -> Result<String, String> {
    let config_path = state.config_path.lock().unwrap().clone();

    let content = tokio::fs::read_to_string(&file_path)
        .await
        .map_err(|e| format!("读取导入文件失败: {}", e))?;

    // 验证 TOML 格式
    let _: FrpcConfig = toml::from_str(&content).map_err(|e| format!("配置文件格式错误: {}", e))?;

    // 复制到配置目录
    tokio::fs::copy(&file_path, &config_path)
        .await
        .map_err(|e| format!("复制配置文件失败: {}", e))?;

    Ok("配置已导入".to_string())
}

/// 导出配置
#[tauri::command]
async fn export_config(state: State<'_, AppState>, dest_path: String) -> Result<String, String> {
    let config_path = state.config_path.lock().unwrap().clone();

    if !config_path.exists() {
        return Err("配置文件不存在".to_string());
    }

    tokio::fs::copy(&config_path, &dest_path)
        .await
        .map_err(|e| format!("导出配置文件失败: {}", e))?;

    Ok("配置已导出".to_string())
}

/// 设置开机自启
#[tauri::command]
async fn set_auto_launch(enabled: bool) -> Result<String, String> {
    let app_path = std::env::current_exe().map_err(|e| format!("获取应用路径失败: {}", e))?;

    let app_name = "FrpcApp";

    match auto_launch::AutoLaunchBuilder::new()
        .set_app_name(app_name)
        .set_app_path(&app_path.to_string_lossy())
        .build()
    {
        Ok(auto_launch) => {
            if enabled {
                auto_launch
                    .enable()
                    .map_err(|e| format!("设置开机自启失败: {}", e))?;
                Ok("已启用开机自启".to_string())
            } else {
                auto_launch
                    .disable()
                    .map_err(|e| format!("取消开机自启失败: {}", e))?;
                Ok("已禁用开机自启".to_string())
            }
        }
        Err(e) => Err(format!("创建 AutoLaunch 失败: {}", e)),
    }
}

/// 获取开机自启状态
#[tauri::command]
async fn get_auto_launch_status() -> Result<bool, String> {
    let app_path = std::env::current_exe().map_err(|e| format!("获取应用路径失败: {}", e))?;

    let app_name = "FrpcApp";

    match auto_launch::AutoLaunchBuilder::new()
        .set_app_name(app_name)
        .set_app_path(&app_path.to_string_lossy())
        .build()
    {
        Ok(auto_launch) => Ok(auto_launch.is_enabled().unwrap_or(false)),
        Err(_) => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = get_app_dir(app.handle())?;
            let binary_path = get_binary_path(&app_dir);
            let config_path = get_config_path(&app_dir);

            app.manage(AppState {
                frpc_process: TokioMutex::new(None),
                is_running: AtomicBool::new(false),
                config_path: Mutex::new(config_path),
                binary_path: Mutex::new(binary_path),
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            download_frpc,
            start_frpc,
            stop_frpc,
            get_frpc_status,
            save_config,
            load_config,
            import_config,
            export_config,
            set_auto_launch,
            get_auto_launch_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
