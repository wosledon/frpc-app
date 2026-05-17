# Frpc App

一个基于 Tauri v2 的桌面应用，用于管理 frpc 内网穿透客户端。

## 功能特性

- ✅ 可视化 frpc 服务管理（启动/停止）
- ✅ 自动从 GitHub Releases 下载最新 frpc 二进制
- ✅ 支持 TCP/UDP/STCP/HTTP/HTTPS 代理类型配置
- ✅ frps 服务器配置管理
- ✅ frpc.toml 配置文件导入/导出
- ✅ 开机自启设置
- ✅ Material Design 现代化 UI

## 技术栈

- **前端**: React 19 + TypeScript + Vite + MUI (Material-UI)
- **后端**: Rust + Tauri v2
- **配置格式**: TOML

## 开发环境要求

- Node.js 18+
- Rust 1.70+
- Windows/macOS/Linux

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run tauri dev
```

这将同时启动前端 Vite dev server 和 Tauri 应用。

### 生产构建

```bash
npm run tauri build
```

构建产物将位于 `src-tauri/target/release/bundle/` 目录下。

## 使用说明

### 1. 下载 frpc

首次使用需要点击"下载 frpc"按钮，应用会自动从 GitHub 下载适用于当前平台的最新 frpc 二进制文件。

### 2. 配置 frps 服务器

在"服务器配置"标签页中设置：
- 服务器地址（如：`frp.example.com`）
- 服务器端口（默认：7000）
- 认证密钥（与 frps 配置一致）

### 3. 添加代理

在"代理配置"标签页中：
1. 点击"添加代理"
2. 配置代理名称、类型、本地地址/端口、远程端口
3. 支持 TCP、UDP、STCP、HTTP、HTTPS 等类型

### 4. 启动服务

配置完成后，点击"启动服务"按钮即可启动 frpc。

### 5. 导入/导出配置

- **导入**: 从外部 TOML 文件导入配置
- **导出**: 将当前配置导出为 TOML 文件

## 项目结构

```
frpc-app/
├── src/                    # 前端代码
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 入口文件
│   └── App.css            # 样式文件
├── src-tauri/             # 后端代码
│   ├── src/
│   │   ├── lib.rs         # Tauri commands 和业务逻辑
│   │   └── main.rs        # 应用入口
│   ├── capabilities/      # 权限配置
│   └── tauri.conf.json    # Tauri 配置
├── docs/                  # 文档
│   ├── PRD.md             # 产品需求
│   └── frpc_full_example.toml
└── package.json
```

## 核心功能实现

### Rust 端 (Backend)

- **进程管理**: 使用 `tokio::process::Command` 管理 frpc 子进程
- **配置管理**: 使用 `toml` crate 解析和生成 TOML 配置
- **网络请求**: 使用 `reqwest` 下载 frpc 二进制文件
- **开机自启**: 使用 `auto-launch` crate 跨平台支持

### 前端 (Frontend)

- **状态管理**: React Hooks (useState, useEffect)
- **UI 组件**: MUI (Material-UI) 组件库
- **IPC 通信**: 通过 `@tauri-apps/api/core` 的 `invoke()` 调用 Rust 命令

## 注意事项

1. **权限配置**: 新增功能需要在 `capabilities/default.json` 中添加相应权限
2. **二进制下载**: 当前版本为简化实现，完整版本需要解压 tar.gz 文件
3. **日志捕获**: 后续版本可添加 stdout/stderr 捕获和日志显示
4. **托盘图标**: 可考虑添加系统托盘图标支持

## 许可证

MIT
