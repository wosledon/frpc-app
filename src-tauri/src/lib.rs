use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, State,
};
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
fn get_app_dir(_app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().ok_or("无法获取程序目录")?;
    let app_dir = exe_dir.join("data");
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

/// 获取下载信息（URL + 平台文件名）
#[tauri::command]
async fn get_download_info() -> Result<serde_json::Value, String> {
    let platform = get_platform_identifier()?;
    let is_windows = cfg!(target_os = "windows");
    let ext = if is_windows { "zip" } else { "tar.gz" };

    let download_page = "https://github.com/fatedier/frp/releases".to_string();
    let binary_name = if is_windows { "frpc.exe" } else { "frpc" };

    Ok(serde_json::json!({
        "download_page": download_page,
        "platform": platform,
        "ext": ext,
        "binary_name": binary_name,
    }))
}

/// 获取当前平台对应的 frpc 二进制文件名
#[tauri::command]
fn get_binary_name() -> String {
    if cfg!(target_os = "windows") {
        "frpc.exe".to_string()
    } else {
        "frpc".to_string()
    }
}

/// 获取数据目录路径
#[tauri::command]
async fn get_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = get_app_dir(&app_handle)?;
    Ok(app_dir.to_string_lossy().to_string())
}

/// 在文件管理器中打开数据目录
#[tauri::command]
async fn open_data_dir(app_handle: tauri::AppHandle) -> Result<String, String> {
    let app_dir = get_app_dir(&app_handle)?;
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(app_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(app_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(app_dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("打开文件管理器失败: {}", e))?;
    }
    Ok("已打开目录".to_string())
}

/// 设置 frpc 二进制文件路径
#[tauri::command]
async fn set_binary_path(state: State<'_, AppState>, path: String) -> Result<String, String> {
    let new_path = PathBuf::from(&path);
    if !new_path.exists() {
        return Err("文件不存在".to_string());
    }
    *state.binary_path.lock().unwrap() = new_path;
    Ok("已设置 frpc 路径".to_string())
}

/// 检查 frpc 二进制是否可用
#[tauri::command]
async fn check_binary_status(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let binary_path = state.binary_path.lock().unwrap().clone();
    let exists = binary_path.exists();
    Ok(serde_json::json!({
        "exists": exists,
        "path": binary_path.to_string_lossy(),
    }))
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

            // 系统托盘
            let show_item = MenuItemBuilder::with_id("show", "显示窗口").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .separator()
                .item(&quit_item)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .tooltip("frpc-app")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_download_info,
            get_data_dir,
            open_data_dir,
            set_binary_path,
            check_binary_status,
            start_frpc,
            stop_frpc,
            get_frpc_status,
            save_config,
            load_config,
            import_config,
            export_config,
            set_auto_launch,
            get_auto_launch_status,
            get_binary_name,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
