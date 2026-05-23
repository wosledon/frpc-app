import { useState, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Snackbar,
  Divider,
  Switch,
  Tooltip,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  CssBaseline,
  ThemeProvider,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  Download,
  Save,
  Upload,
  Add,
  Delete,
  Settings,
  Storage,
  PowerSettingsNew,
  Refresh,
  Cloud,
  DarkMode,
  LightMode,
  Translate,
} from "@mui/icons-material";
import { I18nContext, createI18n, useI18n, type Lang, type I18nContextValue } from "./i18n";
import { getCssVars, createAppTheme, type ThemeMode } from "./theme";

/* ─────────── Interfaces ─────────── */
interface FrpsConfig {
  server_addr: string;
  server_port: number;
  auth_token: string;
}

interface ProxyConfig {
  name: string;
  type: string;
  local_ip: string;
  local_port: number;
  remote_port?: number;
  custom_domains?: string[];
}

interface FrpcConfig {
  frps: FrpsConfig;
  proxies: ProxyConfig[];
}

/* ─────────── Navigation ─────────── */
interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ReactNode;
  section?: "main" | "bottom";
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", labelKey: "nav.home", icon: <PowerSettingsNew />, section: "main" },
  { id: "server", labelKey: "nav.server", icon: <Cloud />, section: "main" },
  { id: "proxies", labelKey: "nav.proxies", icon: <Storage />, section: "main" },
  { id: "settings", labelKey: "nav.settings", icon: <Settings />, section: "bottom" },
];

const PAGE_TITLE_KEYS: Record<string, string> = {
  home: "app.title",
  server: "server.title",
  proxies: "proxies.title",
  settings: "settings.theme",
};

/* ─────────── useApp Hook ─────────── */
function useApp() {
  const { t } = useI18n();
  const [currentPage, setCurrentPage] = useState("home");
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [config, setConfig] = useState<FrpcConfig>({
    frps: { server_addr: "127.0.0.1", server_port: 7000, auth_token: "" },
    proxies: [],
  });
  const [autoLaunch, setAutoLaunch] = useState(false);

  useEffect(() => {
    loadConfig();
    checkStatus();
    checkAutoLaunch();
  }, []);

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    setSnackbarOpen(true);
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const result = await invoke<FrpcConfig>("load_config");
      setConfig(result);
    } catch (error) {
      showMessage(t("msg.load_config_fail") + error);
    }
  }, [showMessage, t]);

  const checkStatus = useCallback(async () => {
    try {
      const status = await invoke<{ is_running: boolean }>("get_frpc_status");
      setIsRunning(status.is_running);
    } catch (error) {
      console.error("检查状态失败:", error);
    }
  }, []);

  const checkAutoLaunch = useCallback(async () => {
    try {
      const enabled = await invoke<boolean>("get_auto_launch_status");
      setAutoLaunch(enabled);
    } catch (error) {
      console.error("检查开机自启失败:", error);
    }
  }, []);

  const handleToggleService = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isRunning) {
        const result = await invoke<string>("stop_frpc");
        showMessage(result);
        setIsRunning(false);
      } else {
        const result = await invoke<string>("start_frpc");
        showMessage(result);
        setIsRunning(true);
      }
    } catch (error) {
      showMessage((isRunning ? t("msg.stop_fail") : t("msg.start_fail")) + error);
    } finally {
      setIsLoading(false);
    }
  }, [isRunning, showMessage, t]);

  const handleDownload = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>("download_frpc");
      showMessage(result);
    } catch (error) {
      showMessage(t("msg.download_fail") + error);
    } finally {
      setIsLoading(false);
    }
  }, [showMessage, t]);

  const handleSaveConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>("save_config", { config });
      showMessage(result);
    } catch (error) {
      showMessage(t("msg.save_config_fail") + error);
    } finally {
      setIsLoading(false);
    }
  }, [config, showMessage, t]);

  const handleImportConfig = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: t("dialog.select_config"),
        filters: [{ name: "TOML", extensions: ["toml"] }],
      });
      if (selected) {
        const result = await invoke<string>("import_config", { filePath: selected });
        showMessage(result);
        loadConfig();
      }
    } catch (error) {
      showMessage(t("msg.import_config_fail") + error);
    }
  }, [showMessage, loadConfig, t]);

  const handleExportConfig = useCallback(async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: t("dialog.select_save"),
        filters: [{ name: "TOML", extensions: ["toml"] }],
      });
      if (selected) {
        const result = await invoke<string>("export_config", { destPath: selected });
        showMessage(result);
      }
    } catch (error) {
      showMessage(t("msg.export_config_fail") + error);
    }
  }, [showMessage, t]);

  const handleAutoLaunchToggle = useCallback(async (enabled: boolean) => {
    try {
      const result = await invoke<string>("set_auto_launch", { enabled });
      showMessage(result);
      setAutoLaunch(enabled);
    } catch (error) {
      showMessage(t("msg.autolaunch_fail") + error);
    }
  }, [showMessage, t]);

  const handleAddProxy = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      proxies: [
        ...prev.proxies,
        {
          name: `proxy_${prev.proxies.length + 1}`,
          type: "tcp",
          local_ip: "127.0.0.1",
          local_port: 8080,
          remote_port: 9090,
        },
      ],
    }));
  }, []);

  const handleDeleteProxy = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      proxies: prev.proxies.filter((_, i) => i !== index),
    }));
  }, []);

  const handleProxyChange = useCallback(
    (index: number, field: string, value: string | number | undefined) => {
      setConfig((prev) => {
        const newProxies = [...prev.proxies];
        newProxies[index] = { ...newProxies[index], [field]: value };
        return { ...prev, proxies: newProxies };
      });
    },
    []
  );

  return {
    currentPage,
    setCurrentPage,
    isRunning,
    isLoading,
    message,
    snackbarOpen,
    setSnackbarOpen,
    config,
    setConfig,
    autoLaunch,
    handleToggleService,
    handleDownload,
    handleSaveConfig,
    handleImportConfig,
    handleExportConfig,
    handleAutoLaunchToggle,
    handleAddProxy,
    handleDeleteProxy,
    handleProxyChange,
  };
}

/* ─────────── Shared Input Sx ─────────── */
const inputSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 1.5,
    color: "var(--text-primary)",
    fontSize: "0.85rem",
    bgcolor: "var(--bg-input)",
    "& fieldset": { borderColor: "var(--border)" },
    "&:hover fieldset": { borderColor: "var(--accent)" },
    "&.Mui-focused fieldset": {
      borderColor: "var(--accent)",
      borderWidth: 1,
    },
  },
  "& .MuiInputLabel-root": {
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    "&.Mui-focused": { color: "var(--accent)" },
  },
};

/* ─────────── Sidebar ─────────── */
function Sidebar({
  currentPage,
  isRunning,
  onNavigate,
}: {
  currentPage: string;
  isRunning: boolean;
  onNavigate: (id: string) => void;
}) {
  const { t } = useI18n();
  const mainItems = NAV_ITEMS.filter((i) => i.section !== "bottom");
  const bottomItems = NAV_ITEMS.filter((i) => i.section === "bottom");

  const renderItem = (item: NavItem) => {
    const isActive = currentPage === item.id;
    return (
      <Tooltip title={t(item.labelKey as Parameters<typeof t>[0])} placement="right" key={item.id}>
        <Box
          onClick={() => onNavigate(item.id)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.5,
            py: 1,
            borderRadius: 1.5,
            cursor: "pointer",
            color: isActive ? "white" : "var(--text-secondary)",
            bgcolor: isActive ? "var(--accent)" : "transparent",
            transition: "all 0.15s ease",
            "&:hover": {
              bgcolor: isActive ? "var(--accent)" : "var(--accent-glow)",
              color: isActive ? "white" : "var(--text-primary)",
            },
            position: "relative",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", fontSize: "1.1rem" }}>
            {item.icon}
          </Box>
          <Typography sx={{ fontSize: "0.82rem", fontWeight: isActive ? 600 : 400 }}>
            {t(item.labelKey as Parameters<typeof t>[0])}
          </Typography>
          {item.id === "home" && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: isRunning ? "var(--success)" : "var(--text-muted)",
                boxShadow: isRunning ? "0 0 6px var(--success-glow)" : "none",
                ml: "auto",
              }}
            />
          )}
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box
      sx={{
        width: "var(--sidebar-w)",
        height: "100vh",
        bgcolor: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        py: 1.5,
        px: 1,
      }}
    >
      <Box sx={{ px: 1.5, py: 1.5, mb: 1 }}>
        <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Frpc Manager
        </Typography>
        <Typography sx={{ fontSize: "0.65rem", color: "var(--text-muted)", mt: 0.3 }}>
          {t("app.subtitle")}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: "var(--border-light)", mx: 1, mb: 1 }} />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3, flex: 1 }}>
        {mainItems.map(renderItem)}
      </Box>

      <Divider sx={{ borderColor: "var(--border-light)", mx: 1, mb: 1 }} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
        {bottomItems.map(renderItem)}
      </Box>
    </Box>
  );
}

/* ─────────── Pages ─────────── */
function HomePage({
  isRunning,
  isLoading,
  onToggle,
  onDownload,
  config,
}: {
  isRunning: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onDownload: () => void;
  config: FrpcConfig;
}) {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 4,
        bgcolor: "var(--bg-content)",
        overflow: "hidden",
      }}
    >
      {/* Connection Info */}
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            color: "var(--text-secondary)",
            fontSize: "0.8rem",
            fontFamily: "monospace",
            letterSpacing: "0.5px",
          }}
        >
          {config.frps.server_addr}:{config.frps.server_port}
        </Typography>
        <Typography sx={{ color: "var(--text-muted)", fontSize: "0.7rem", mt: 0.5 }}>
          {config.proxies.length} {t("home.proxies_count")}
        </Typography>
      </Box>

      {/* Main Button */}
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        {/* Glow ring */}
        <Box
          sx={{
            position: "absolute",
            inset: -12,
            borderRadius: "50%",
            background: isRunning
              ? "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
            transition: "background 0.5s ease",
          }}
        />
        <IconButton
          onClick={onToggle}
          disabled={isLoading}
          sx={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: isRunning
              ? "linear-gradient(135deg, #ef4444, #dc2626)"
              : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: isRunning
              ? "0 4px 24px var(--danger-glow)"
              : "0 4px 24px var(--accent-glow)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            "&:hover": {
              transform: "scale(1.06)",
              boxShadow: isRunning
                ? "0 6px 32px var(--danger-glow)"
                : "0 6px 32px var(--accent-glow)",
            },
            "&:active": { transform: "scale(0.95)" },
            "&.Mui-disabled": { opacity: 0.7 },
          }}
        >
          {isLoading ? (
            <CircularProgress size={28} sx={{ color: "white" }} />
          ) : isRunning ? (
            <Stop sx={{ fontSize: "2rem", color: "white" }} />
          ) : (
            <PlayArrow sx={{ fontSize: "2rem", color: "white", ml: 0.4 }} />
          )}
        </IconButton>
      </Box>

      {/* Status text */}
      <Box sx={{ textAlign: "center" }}>
        <Typography
          sx={{
            color: isRunning ? "var(--success)" : "var(--text-secondary)",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {isLoading ? t("home.status.loading") : isRunning ? t("home.status.running") : t("home.status.stopped")}
        </Typography>
        <Typography sx={{ color: "var(--text-muted)", fontSize: "0.72rem", mt: 0.5 }}>
          {isRunning ? t("home.action.stop") : t("home.action.start")}
        </Typography>
      </Box>

      {/* Download */}
      {!isRunning && (
        <Button
          onClick={onDownload}
          disabled={isLoading}
          startIcon={<Download />}
          sx={{
            color: "var(--text-muted)",
            textTransform: "none",
            fontSize: "0.75rem",
            py: 0.6,
            px: 2,
            borderRadius: 2,
            border: "1px solid var(--border-light)",
            "&:hover": {
              color: "var(--text-secondary)",
              borderColor: "var(--border)",
              bgcolor: "rgba(99, 102, 241, 0.06)",
            },
          }}
        >
          {t("home.download")}
        </Button>
      )}
    </Box>
  );
}

function ServerPage({
  config,
  setConfig,
}: {
  config: FrpcConfig;
  setConfig: React.Dispatch<React.SetStateAction<FrpcConfig>>;
}) {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        p: { xs: 2, sm: 3, md: 4 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 600 }}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <TextField
              label={t("server.addr")}
              value={config.frps.server_addr}
              onChange={(e) =>
                setConfig({
                  ...config,
                  frps: { ...config.frps, server_addr: e.target.value },
                })
              }
              fullWidth
              sx={inputSx}
            />
            <TextField
              label={t("server.port")}
              type="number"
              value={config.frps.server_port}
              onChange={(e) =>
                setConfig({
                  ...config,
                  frps: {
                    ...config.frps,
                    server_port: parseInt(e.target.value) || 7000,
                  },
                })
              }
              fullWidth
              sx={inputSx}
            />
            <TextField
              label={t("server.token")}
              type="password"
              value={config.frps.auth_token}
              onChange={(e) =>
                setConfig({
                  ...config,
                  frps: { ...config.frps, auth_token: e.target.value },
                })
              }
              fullWidth
              sx={inputSx}
            />
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

function ProxiesPage({
  config,
  onAdd,
  onDelete,
  onChange,
}: {
  config: FrpcConfig;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onChange: (index: number, field: string, value: string | number | undefined) => void;
}) {
  const { t } = useI18n();
  return (
    <Box sx={{ height: "100%", overflow: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        {/* Summary bar */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ color: "var(--text-primary)", fontSize: "0.95rem", fontWeight: 600 }}>
              {t("proxies.title")}
            </Typography>
            <Chip
              label={config.proxies.length}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                bgcolor: "var(--accent-glow)",
                color: "var(--accent)",
                fontWeight: 600,
              }}
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<Add />}
            onClick={onAdd}
            sx={{
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.8rem",
              borderRadius: 1.5,
              px: 2,
              bgcolor: "var(--accent)",
              "&:hover": { bgcolor: "var(--accent-hover)" },
            }}
          >
            {t("proxies.add")}
          </Button>
        </Box>

        {/* Proxy list */}
        {config.proxies.map((proxy, index) => (
          <Paper
            key={index}
            sx={{
              mb: 1.5,
              borderRadius: 2,
              bgcolor: "var(--bg-card)",
              border: "1px solid var(--border)",
              overflow: "hidden",
              transition: "border-color 0.15s ease",
              "&:hover": { borderColor: "rgba(99, 102, 241, 0.25)" },
            }}
          >
            {/* Card header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2.5,
                py: 1.5,
                borderBottom: "1px solid var(--border-light)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, minWidth: 0 }}>
                <TextField
                  value={proxy.name}
                  onChange={(e) => onChange(index, "name", e.target.value)}
                  variant="standard"
                  placeholder={t("proxy.name")}
                  sx={{
                    flex: 1,
                    "& .MuiInput-root": {
                      color: "var(--text-primary)",
                      fontSize: "0.88rem",
                      fontWeight: 500,
                      "&:before": { borderColor: "transparent" },
                      "&:after": { borderColor: "var(--accent)" },
                    },
                    "& .MuiInput-input": { py: 0.3 },
                  }}
                />
                <TextField
                  select
                  value={proxy.type}
                  onChange={(e) => onChange(index, "type", e.target.value)}
                  size="small"
                  slotProps={{ select: { native: true } }}
                  sx={{
                    width: 90,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 1,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--accent)",
                      height: 30,
                      "& fieldset": { borderColor: "var(--border)" },
                      "&:hover fieldset": { borderColor: "var(--accent)" },
                    },
                  }}
                >
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="stcp">STCP</option>
                  <option value="http">HTTP</option>
                  <option value="https">HTTPS</option>
                </TextField>
              </Box>
              <IconButton
                size="small"
                onClick={() => onDelete(index)}
                sx={{
                  ml: 1,
                  color: "var(--text-muted)",
                  "&:hover": { color: "var(--danger)", bgcolor: "var(--danger-glow)" },
                }}
              >
                <Delete sx={{ fontSize: "1rem" }} />
              </IconButton>
            </Box>

            {/* Card body */}
            <Box sx={{ px: 2.5, py: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label={t("proxy.local_ip")}
                value={proxy.local_ip}
                onChange={(e) => onChange(index, "local_ip", e.target.value)}
                size="small"
                sx={{ flex: "1 1 200px", ...inputSx }}
              />
              <TextField
                label={t("proxy.local_port")}
                type="number"
                value={proxy.local_port}
                onChange={(e) => onChange(index, "local_port", parseInt(e.target.value) || 0)}
                size="small"
                sx={{ width: 110, ...inputSx }}
              />
              <TextField
                label={t("proxy.remote_port")}
                type="number"
                value={proxy.remote_port || ""}
                onChange={(e) =>
                  onChange(index, "remote_port", parseInt(e.target.value) || undefined)
                }
                size="small"
                sx={{ width: 110, ...inputSx }}
              />
            </Box>
          </Paper>
        ))}

        {/* Empty state */}
        {config.proxies.length === 0 && (
          <Paper
            sx={{
              p: 6,
              textAlign: "center",
              borderRadius: 2,
              bgcolor: "var(--bg-card)",
              border: "1px dashed var(--border)",
            }}
          >
            <Storage sx={{ fontSize: "2.5rem", color: "var(--text-muted)", mb: 1.5 }} />
            <Typography sx={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              {t("proxies.empty")}
            </Typography>
            <Typography sx={{ color: "var(--text-muted)", fontSize: "0.75rem", mt: 0.5 }}>
              {t("proxies.empty_hint")}
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

function SettingsPage({
  autoLaunch,
  isLoading,
  themeMode,
  lang,
  onAutoLaunchToggle,
  onImport,
  onExport,
  onSave,
  onThemeChange,
  onLangChange,
}: {
  autoLaunch: boolean;
  isLoading: boolean;
  themeMode: ThemeMode;
  lang: Lang;
  onAutoLaunchToggle: (enabled: boolean) => void;
  onImport: () => void;
  onExport: () => void;
  onSave: () => void;
  onThemeChange: (mode: ThemeMode) => void;
  onLangChange: (lang: Lang) => void;
}) {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        height: "100%",
        overflow: "auto",
        p: { xs: 2, sm: 3, md: 4 },
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 600 }}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 2,
            bgcolor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Theme */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {themeMode === "dark" ? <DarkMode sx={{ fontSize: "1.1rem", color: "var(--text-secondary)" }} /> : <LightMode sx={{ fontSize: "1.1rem", color: "var(--text-secondary)" }} />}
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  {t("settings.theme")}
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={themeMode}
                exclusive
                onChange={(_, v) => v && onThemeChange(v)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    fontSize: "0.75rem",
                    px: 1.5,
                    py: 0.3,
                    color: "var(--text-secondary)",
                    borderColor: "var(--border)",
                    "&.Mui-selected": { bgcolor: "var(--accent)", color: "white", "&:hover": { bgcolor: "var(--accent-hover)" } },
                  },
                }}
              >
                <ToggleButton value="dark">{t("settings.theme.dark")}</ToggleButton>
                <ToggleButton value="light">{t("settings.theme.light")}</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Language */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Translate sx={{ fontSize: "1.1rem", color: "var(--text-secondary)" }} />
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  {t("settings.language")}
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={lang}
                exclusive
                onChange={(_, v) => v && onLangChange(v)}
                size="small"
                sx={{
                  "& .MuiToggleButton-root": {
                    textTransform: "none",
                    fontSize: "0.75rem",
                    px: 1.5,
                    py: 0.3,
                    color: "var(--text-secondary)",
                    borderColor: "var(--border)",
                    "&.Mui-selected": { bgcolor: "var(--accent)", color: "white", "&:hover": { bgcolor: "var(--accent-hover)" } },
                  },
                }}
              >
                <ToggleButton value="zh">中文</ToggleButton>
                <ToggleButton value="en">EN</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Divider sx={{ borderColor: "var(--border-light)" }} />

            {/* Auto launch */}
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-primary)" }}>
                  {t("settings.autolaunch")}
                </Typography>
                <Typography sx={{ fontSize: "0.72rem", color: "var(--text-muted)", mt: 0.3 }}>
                  {t("settings.autolaunch_desc")}
                </Typography>
              </Box>
              <Switch
                checked={autoLaunch}
                onChange={(e) => onAutoLaunchToggle(e.target.checked)}
                sx={{
                  "& .MuiSwitch-switchBase.Mui-checked": { color: "var(--accent)" },
                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                    bgcolor: "var(--accent)",
                  },
                }}
              />
            </Box>
            <Divider sx={{ borderColor: "var(--border-light)" }} />

            {/* Import / Export */}
            <Box>
              <Typography sx={{ fontSize: "0.82rem", color: "var(--text-secondary)", mb: 1.5 }}>
                {t("settings.config")}
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Upload />}
                  onClick={onImport}
                  sx={{
                    flex: 1,
                    textTransform: "none",
                    fontSize: "0.8rem",
                    borderRadius: 1.5,
                    color: "var(--text-secondary)",
                    borderColor: "var(--border)",
                    "&:hover": { borderColor: "var(--accent)", color: "var(--text-primary)" },
                  }}
                >
                  {t("settings.import")}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Download />}
                  onClick={onExport}
                  sx={{
                    flex: 1,
                    textTransform: "none",
                    fontSize: "0.8rem",
                    borderRadius: 1.5,
                    color: "var(--text-secondary)",
                    borderColor: "var(--border)",
                    "&:hover": { borderColor: "var(--accent)", color: "var(--text-primary)" },
                  }}
                >
                  {t("settings.export")}
                </Button>
              </Box>
            </Box>
            <Divider sx={{ borderColor: "var(--border-light)" }} />

            {/* Save */}
            <Button
              variant="contained"
              startIcon={isLoading ? <CircularProgress size={16} sx={{ color: "white" }} /> : <Save />}
              onClick={onSave}
              disabled={isLoading}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.85rem",
                py: 1.2,
                borderRadius: 1.5,
                bgcolor: "var(--accent)",
                "&:hover": { bgcolor: "var(--accent-hover)" },
              }}
            >
              {t("settings.save")}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}

/* ─────────── PageToolbar ─────────── */
function PageToolbar({
  title,
  isRunning,
  onRefresh,
}: {
  title: string;
  isRunning: boolean;
  onRefresh?: () => void;
}) {
  const { t } = useI18n();
  return (
    <Box
      sx={{
        height: "var(--toolbar-h)",
        minHeight: "var(--toolbar-h)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        borderBottom: "1px solid var(--border-light)",
        bgcolor: "var(--bg-content)",
      }}
    >
      <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Chip
          label={isRunning ? t("toolbar.running") : t("toolbar.stopped")}
          size="small"
          sx={{
            height: 22,
            fontSize: "0.68rem",
            fontWeight: 600,
            bgcolor: isRunning ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.06)",
            color: isRunning ? "var(--success)" : "var(--text-muted)",
          }}
        />
        {onRefresh && (
          <IconButton size="small" onClick={onRefresh} sx={{ color: "var(--text-muted)" }}>
            <Refresh sx={{ fontSize: "1rem" }} />
          </IconButton>
        )}
      </Box>
    </Box>
  );
}

/* ─────────── App (Root) ─────────── */
function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    () => (localStorage.getItem("theme-mode") as ThemeMode) || "dark"
  );
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("lang") as Lang) || "zh"
  );

  const i18nValue = useMemo<I18nContextValue>(
    () => ({ lang, setLang, t: createI18n(lang) }),
    [lang]
  );
  const theme = useMemo(() => createAppTheme(themeMode), [themeMode]);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("theme-mode", mode);
  };
  const handleLangChange = (l: Lang) => {
    setLang(l);
    localStorage.setItem("lang", l);
  };

  return (
    <I18nContext.Provider value={i18nValue}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>{getCssVars(themeMode)}</style>
      <AppContent
        themeMode={themeMode}
        lang={lang}
        onThemeChange={handleThemeChange}
        onLangChange={handleLangChange}
      />
    </ThemeProvider>
    </I18nContext.Provider>
  );
}

/* ─────────── AppContent ─────────── */
function AppContent({
  themeMode,
  lang,
  onThemeChange,
  onLangChange,
}: {
  themeMode: ThemeMode;
  lang: Lang;
  onThemeChange: (mode: ThemeMode) => void;
  onLangChange: (lang: Lang) => void;
}) {
  const { t } = useI18n();
  const {
    currentPage,
    setCurrentPage,
    isRunning,
    isLoading,
    message,
    snackbarOpen,
    setSnackbarOpen,
    config,
    setConfig,
    autoLaunch,
    handleToggleService,
    handleDownload,
    handleSaveConfig,
    handleImportConfig,
    handleExportConfig,
    handleAutoLaunchToggle,
    handleAddProxy,
    handleDeleteProxy,
    handleProxyChange,
  } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case "server":
        return <ServerPage config={config} setConfig={setConfig} />;
      case "proxies":
        return (
          <ProxiesPage
            config={config}
            onAdd={handleAddProxy}
            onDelete={handleDeleteProxy}
            onChange={handleProxyChange}
          />
        );
      case "settings":
        return (
          <SettingsPage
            autoLaunch={autoLaunch}
            isLoading={isLoading}
            themeMode={themeMode}
            lang={lang}
            onAutoLaunchToggle={handleAutoLaunchToggle}
            onImport={handleImportConfig}
            onExport={handleExportConfig}
            onSave={handleSaveConfig}
            onThemeChange={onThemeChange}
            onLangChange={onLangChange}
          />
        );
      default:
        return (
          <HomePage
            isRunning={isRunning}
            isLoading={isLoading}
            onToggle={handleToggleService}
            onDownload={handleDownload}
            config={config}
          />
        );
    }
  };

  const showToolbar = currentPage !== "home";

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        currentPage={currentPage}
        isRunning={isRunning}
        onNavigate={setCurrentPage}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: "var(--bg-content)",
        }}
      >
        {showToolbar && (
          <PageToolbar
            title={t((PAGE_TITLE_KEYS[currentPage] || "app.title") as Parameters<typeof t>[0])}
            isRunning={isRunning}
          />
        )}
        <Box sx={{ flex: 1, overflow: "hidden" }}>{renderPage()}</Box>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="info"
          onClose={() => setSnackbarOpen(false)}
          sx={{
            bgcolor: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
