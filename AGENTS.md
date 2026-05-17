# AGENTS.md — frpc-app

Tauri v2 桌面应用，用于管理 frpc 内网穿透客户端。React 前端 + Rust 后端。

## 常用命令

| 命令                  | 用途                                             |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | 启动 Vite 前端 dev server (port 1420)            |
| `npm run build`       | 编译 TS + Vite 构建到 `dist/`                    |
| `npm run tauri dev`   | Tauri 全栈开发模式（前端 + Rust）                |
| `npm run tauri build` | 生产构建（Vite build + `cargo build --release`） |
| `cargo check`         | Rust 语法/类型检查（`src-tauri/` 目录下运行）    |

## 架构

```
Frontend (React/TS)                    Backend (Rust)
src/App.tsx                             src-tauri/src/lib.rs
  invoke("command", { args })  ──────→   #[tauri::command] fn command(...)
```

- **IPC**: 通过 `@tauri-apps/api/core` 的 `invoke()` 调用，后端用 `#[tauri::command]` 注册
- **插件**: 使用 `tauri_plugin_opener`
- **前端入口**: `index.html` → `src/main.tsx` → `<App />`
- **Rust 入口**: `src-tauri/src/main.rs` 调用 `lib::run()`
- **Lib crate 类型**: `["staticlib", "cdylib", "rlib"]`（Windows 兼容）

## 约定

### TypeScript
- 严格模式 (`strict: true`)，含 `noUnusedLocals` / `noUnusedParameters`
- 目标 ES2020，JSX: `react-jsx`，模块: ESNext
- 无 ESLint/Prettier 配置 — 仅依靠 `tsc` 检查
- **待安装**: Material Design UI 库（如 MUI）

### Rust
- Edition 2021
- Serde 用于 JSON 序列化/反序列化
- 新增 Tauri command 需在 `lib.rs` 的 `generate_handler![]` 中注册

### Tauri v2
- App ID: `com.administrator.frpc-app`
- CSP: `null`（桌面应用不限制）
- 新功能需要的权限需在 `src-tauri/capabilities/default.json` 中添加

## 关键注意事项

1. **新增 Tauri 功能需要权限**：如执行 shell 命令需 `shell:allow-execute`，文件 I/O 需 `fs:allow-*`，HTTP 请求需 `http:allow-*`。这些需添加到 `capabilities/default.json`。

2. **frpc 进程管理**：frpc 作为长期运行子进程，需要管理 PID、捕获 stdout/stderr、优雅关闭。

3. **二进制下载**：需根据平台（Windows/macOS/Linux，x86/ARM）从 GitHub Releases 下载对应的 frpc 二进制文件。

4. **TOML 配置解析**：frpc 配置使用 TOML 格式（参考 `docs/frpc_full_example.toml`），解析需要在 Rust 端添加 `toml` 或 `serde_toml` crate。

5. **无测试基础设施**：前后端暂未配置测试框架。添加前应先规划。

## 参考文档

- [PRD.md](docs/PRD.md) — 产品需求文档
- [frpc_full_example.toml](docs/frpc_full_example.toml) — frpc 完整配置示例
- [Tauri v2 文档](https://v2.tauri.app/)
