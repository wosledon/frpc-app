import { createContext, useContext } from "react";

export type Lang = "zh" | "en";

const translations = {
  zh: {
    // Sidebar
    "nav.home": "首页",
    "nav.server": "服务器",
    "nav.proxies": "代理",
    "nav.settings": "设置",
    "app.title": "Frpc Manager",
    "app.subtitle": "内网穿透管理工具",

    // Home
    "home.proxies_count": "个代理已配置",
    "home.status.running": "运行中",
    "home.status.stopped": "已停止",
    "home.status.loading": "处理中...",
    "home.action.stop": "点击停止服务",
    "home.action.start": "点击启动服务",
    "home.download": "下载 frpc",

    // Toolbar
    "toolbar.running": "运行中",
    "toolbar.stopped": "已停止",

    // Server
    "server.title": "服务器配置",
    "server.addr": "服务器地址",
    "server.port": "服务器端口",
    "server.token": "认证密钥",

    // Proxies
    "proxies.title": "全部代理",
    "proxies.add": "添加代理",
    "proxies.empty": "暂无代理配置",
    "proxies.empty_hint": "点击上方「添加代理」创建第一个代理",
    "proxy.name": "代理名称",
    "proxy.local_ip": "本地地址",
    "proxy.local_port": "本地端口",
    "proxy.remote_port": "远程端口",

    // Settings
    "settings.autolaunch": "开机自启",
    "settings.autolaunch_desc": "系统启动时自动运行 frpc",
    "settings.config": "配置文件",
    "settings.import": "导入",
    "settings.export": "导出",
    "settings.save": "保存配置",
    "settings.theme": "主题",
    "settings.theme.dark": "深色",
    "settings.theme.light": "浅色",
    "settings.language": "语言",

    // Messages
    "msg.load_config_fail": "加载配置失败: ",
    "msg.save_config_fail": "保存配置失败: ",
    "msg.import_config_fail": "导入配置失败: ",
    "msg.export_config_fail": "导出配置失败: ",
    "msg.stop_fail": "停止失败: ",
    "msg.start_fail": "启动失败: ",
    "msg.download_fail": "下载失败: ",
    "msg.autolaunch_fail": "设置开机自启失败: ",

    // Dialog
    "dialog.select_config": "选择配置文件",
    "dialog.select_save": "选择保存位置",
  },
  en: {
    "nav.home": "Home",
    "nav.server": "Server",
    "nav.proxies": "Proxies",
    "nav.settings": "Settings",
    "app.title": "Frpc Manager",
    "app.subtitle": "NAT Traversal Client",

    "home.proxies_count": "proxies configured",
    "home.status.running": "Running",
    "home.status.stopped": "Stopped",
    "home.status.loading": "Processing...",
    "home.action.stop": "Click to stop",
    "home.action.start": "Click to start",
    "home.download": "Download frpc",

    "toolbar.running": "Running",
    "toolbar.stopped": "Stopped",

    "server.title": "Server Config",
    "server.addr": "Server Address",
    "server.port": "Server Port",
    "server.token": "Auth Token",

    "proxies.title": "All Proxies",
    "proxies.add": "Add Proxy",
    "proxies.empty": "No proxies configured",
    "proxies.empty_hint": 'Click "Add Proxy" above to create one',
    "proxy.name": "Proxy Name",
    "proxy.local_ip": "Local IP",
    "proxy.local_port": "Local Port",
    "proxy.remote_port": "Remote Port",

    "settings.autolaunch": "Auto Launch",
    "settings.autolaunch_desc": "Run frpc on system startup",
    "settings.config": "Config File",
    "settings.import": "Import",
    "settings.export": "Export",
    "settings.save": "Save Config",
    "settings.theme": "Theme",
    "settings.theme.dark": "Dark",
    "settings.theme.light": "Light",
    "settings.language": "Language",

    "msg.load_config_fail": "Failed to load config: ",
    "msg.save_config_fail": "Failed to save config: ",
    "msg.import_config_fail": "Failed to import config: ",
    "msg.export_config_fail": "Failed to export config: ",
    "msg.stop_fail": "Failed to stop: ",
    "msg.start_fail": "Failed to start: ",
    "msg.download_fail": "Download failed: ",
    "msg.autolaunch_fail": "Failed to set auto launch: ",

    "dialog.select_config": "Select Config File",
    "dialog.select_save": "Select Save Location",
  },
} as const;

type TranslationKey = keyof (typeof translations)["zh"];

export interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

export const I18nContext = createContext<I18nContextValue>({
  lang: "zh",
  setLang: () => {},
  t: (key) => key,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function createI18n(lang: Lang): I18nContextValue["t"] {
  return (key: TranslationKey) => translations[lang][key] ?? key;
}
