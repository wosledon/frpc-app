# frpc-app

<div align="center">

**[简体中文](./README.md) | English**

**A simple GUI management tool for frp client (frpc)**

![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Rust](https://img.shields.io/badge/Rust-2021-orange)
![React](https://img.shields.io/badge/React-19-blueviolet)
![Release](https://img.shields.io/github/v/release/wosledon/frpc-app)
[![Star History](https://api.star-history.com/svg?repos=wosledon/frpc-app&type=Timeline)](https://star-history.com/#wosledon/frpc-app&Timeline)

</div>

---

![Demo](docs/images/01-index.png)

## Features

| Module       | Description                                                                   |
| ------------ | ----------------------------------------------------------------------------- |
| **Home**     | One-click start/stop frpc service, real-time status, server info, proxy count |
| **Server**   | Configure frps server address (server_addr) and auth token                    |
| **Proxies**  | Visual management of TCP/HTTP proxies — add, edit, delete                     |
| **Settings** | frpc binary status, language switch (zh/en), light/dark theme, auto-launch    |

## Highlights

- **Cross-platform**: Windows / Linux
- **Portable**: All data (frpc binary + config) stored in `data/` next to the executable — **no AppData dependency**
- **Dual themes**: Dark (default) / Light mode
- **Bilingual**: 中文 / English
- **System tray**: Minimize to tray, tray menu with "Show Window" and "Quit"
- **Fixed window**: Locked window size to prevent accidental layout changes

## Quick Start

### Prerequisites

- Node.js ≥ 18
- Rust ≥ 1.70
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/wosledon/frpc-app.git
cd frpc-app

# Install frontend dependencies
npm install

# Development mode
npm run tauri dev
```

### Build from Source

```bash
# Build for current platform
npm run tauri build
```

Output installers are located in `src-tauri/target/release/bundle/`:

| Platform | Format               |
| -------- | -------------------- |
| Windows  | `.msi` / NSIS `.exe` |
| Linux    | `.deb` / `.AppImage` |

### Usage

1. Download the frpc binary for your platform from [frp Releases](https://github.com/fatedier/frp/releases)
2. Place `frpc.exe` (Windows) or `frpc` (Linux) into the `data/` folder next to the app executable
3. Launch frpc-app, go to the **Server** page and fill in the frps connection info
4. Add your local services on the **Proxies** page
5. Click **Start** on the **Home** page to run frpc

## How to Publish a Release

Push a `v*` tag to trigger the CI build and create a GitHub Draft Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow automatically builds on Ubuntu and Windows in parallel.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + MUI
- **Backend**: Tauri v2 + Rust
- **i18n**: react-i18next
- **Config**: TOML (frpc native format)

## Contributing

Issues and Pull Requests are welcome! If you encounter any bugs or have feature requests, feel free to open an issue.

## Related Projects

- [fatedier/frp](https://github.com/fatedier/frp) — The underlying frp project this app manages
