import { useState, useEffect } from "react";
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
  List,
  Snackbar,
  Drawer,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  AppBar,
  Toolbar,
} from "@mui/material";
import {
  PlayArrow,
  Stop,
  Download,
  Save,
  Upload,
  Download as DownloadIcon,
  Add,
  Delete,
  Menu as MenuIcon,
  Settings,
  Storage,
  ExitToApp,
  PowerSettingsNew,
} from "@mui/icons-material";
import { keyframes } from "@mui/material/styles";

// 动画定义
const breathe = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.3;
  }
`;

const drawerWidth = 280;

interface MenuProps {
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

function MenuItem({ icon, text, onClick }: MenuProps) {
  return (
    <ListItem 
      onClick={onClick} 
      sx={{ 
        py: 1.8,
        px: 2.5,
        cursor: 'pointer',
        borderRadius: 2,
        mx: 1.5,
        my: 0.5,
        transition: 'all 0.2s ease',
        color: 'rgba(255, 255, 255, 0.7)',
        '&:hover': { 
          bgcolor: 'rgba(99, 102, 241, 0.15)',
          color: 'white',
          transform: 'translateX(4px)',
        } 
      }} 
      component="li"
    >
      <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText 
        primary={text} 
        sx={{ 
          color: 'inherit',
          '& .MuiListItemText-primary': {
            fontWeight: 500,
            fontSize: '0.95rem',
          }
        }}
      />
    </ListItem>
  );
}

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

// 首页组件
function HomePage({ 
  isRunning, 
  isLoading, 
  onToggle, 
  onDownload 
}: { 
  isRunning: boolean; 
  isLoading: boolean; 
  onToggle: () => void; 
  onDownload: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        background: '#0f0f23',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景光晕已移除 */}

      {/* 星星装饰 - 限制在内部 */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: 1,
              height: 1,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.4)',
              top: `${15 + (i * 7) % 65}%`,
              left: `${10 + (i * 11) % 80}%`,
              animation: `${breathe} ${3 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.3) % 2}s`,
            }}
          />
        ))}
      </Box>

      {/* 状态指示器 */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          background: 'rgba(255, 255, 255, 0.04)',
          px: 1.5,
          py: 0.6,
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <Box
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: isRunning ? '#10b981' : '#4b5563',
            boxShadow: isRunning ? '0 0 6px #10b981' : 'none',
          }}
        />
        <Typography 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.45)',
            fontWeight: 500,
            fontSize: '0.7rem',
          }}
        >
          {isRunning ? '运行中' : '已停止'}
        </Typography>
      </Box>

      {/* 主内容 */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* 标题 */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography 
            sx={{ 
              color: 'white',
              fontWeight: 700,
              fontSize: '1.4rem',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
            }}
          >
            Frpc Manager
          </Typography>
          <Typography 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.3)',
              fontSize: '0.7rem',
              letterSpacing: '1px',
              mt: 0.3,
            }}
          >
            内网穿透管理工具
          </Typography>
        </Box>

        {/* 主按钮 */}
        <Button
          onClick={onToggle}
          disabled={isLoading}
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            minWidth: 'auto',
            p: 0,
            background: isRunning 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: isRunning
              ? '0 4px 20px rgba(239, 68, 68, 0.3)'
              : '0 4px 20px rgba(99, 102, 241, 0.3)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: 'none',
            '&:hover': {
              transform: 'scale(1.08)',
              boxShadow: isRunning
                ? '0 6px 28px rgba(239, 68, 68, 0.45)'
                : '0 6px 28px rgba(99, 102, 241, 0.45)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : isRunning ? (
            <Stop sx={{ fontSize: '1.8rem', color: 'white' }} />
          ) : (
            <PlayArrow sx={{ fontSize: '1.8rem', color: 'white', ml: 0.3 }} />
          )}
        </Button>

        {/* 提示文字 */}
        <Typography 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.35)',
            fontSize: '0.75rem',
            fontWeight: 400,
          }}
        >
          {isRunning ? '点击停止' : '点击启动'}
        </Typography>

        {/* 下载按钮 */}
        {!isRunning && (
          <Button
            onClick={onDownload}
            disabled={isLoading}
            sx={{
              color: 'rgba(255, 255, 255, 0.3)',
              textTransform: 'none',
              fontSize: '0.7rem',
              py: 0.4,
              px: 1.2,
              borderRadius: 1.2,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'transparent',
              '&:hover': {
                color: 'rgba(255, 255, 255, 0.55)',
                background: 'rgba(255, 255, 255, 0.04)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <Download sx={{ fontSize: '0.8rem', mr: 0.5 }} />
            下载 frpc
          </Button>
        )}
      </Box>
    </Box>
  );
}

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [config, setConfig] = useState<FrpcConfig>({
    frps: {
      server_addr: "127.0.0.1",
      server_port: 7000,
      auth_token: "",
    },
    proxies: [],
  });
  const [autoLaunch, setAutoLaunch] = useState(false);

  useEffect(() => {
    loadConfig();
    checkStatus();
    checkAutoLaunch();
  }, []);

  const loadConfig = async () => {
    try {
      const result = await invoke<FrpcConfig>("load_config");
      setConfig(result);
    } catch (error) {
      showMessage("加载配置失败: " + error);
    }
  };

  const checkStatus = async () => {
    try {
      const status = await invoke<{ is_running: boolean }>("get_frpc_status");
      setIsRunning(status.is_running);
    } catch (error) {
      console.error("检查状态失败:", error);
    }
  };

  const checkAutoLaunch = async () => {
    try {
      const enabled = await invoke<boolean>("get_auto_launch_status");
      setAutoLaunch(enabled);
    } catch (error) {
      console.error("检查开机自启失败:", error);
    }
  };

  const showMessage = (msg: string) => {
    setMessage(msg);
    setSnackbarOpen(true);
  };

  const handleToggleService = async () => {
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
      showMessage((isRunning ? "停止" : "启动") + "失败: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>("download_frpc");
      showMessage(result);
    } catch (error) {
      showMessage("下载失败: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>("save_config", { config });
      showMessage(result);
    } catch (error) {
      showMessage("保存配置失败: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportConfig = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: "选择配置文件",
        filters: [{ name: "TOML", extensions: ["toml"] }],
      });
      
      if (selected) {
        const result = await invoke<string>("import_config", {
          filePath: selected,
        });
        showMessage(result);
        loadConfig();
      }
    } catch (error) {
      showMessage("导入配置失败: " + error);
    }
  };

  const handleExportConfig = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        title: "选择保存位置",
        filters: [{ name: "TOML", extensions: ["toml"] }],
      });
      
      if (selected) {
        const result = await invoke<string>("export_config", {
          destPath: selected,
        });
        showMessage(result);
      }
    } catch (error) {
      showMessage("导出配置失败: " + error);
    }
  };

  const handleAutoLaunchToggle = async (enabled: boolean) => {
    try {
      const result = await invoke<string>("set_auto_launch", { enabled });
      showMessage(result);
      setAutoLaunch(enabled);
    } catch (error) {
      showMessage("设置开机自启失败: " + error);
    }
  };

  const handleAddProxy = () => {
    setConfig({
      ...config,
      proxies: [
        ...config.proxies,
        {
          name: `proxy_${config.proxies.length + 1}`,
          type: "tcp",
          local_ip: "127.0.0.1",
          local_port: 8080,
          remote_port: 9090,
        },
      ],
    });
  };

  const handleDeleteProxy = (index: number) => {
    const newProxies = config.proxies.filter((_, i) => i !== index);
    setConfig({ ...config, proxies: newProxies });
  };

  const handleProxyChange = (index: number, field: string, value: any) => {
    const newProxies = [...config.proxies];
    newProxies[index] = { ...newProxies[index], [field]: value };
    setConfig({ ...config, proxies: newProxies });
  };

  // 渲染不同页面
  const renderPage = () => {
    switch (currentPage) {
      case 'server':
        return (
          <Box sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3, color: 'white' }}>
              frps 服务器配置
            </Typography>
            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <TextField
                  label="服务器地址"
                  value={config.frps.server_addr}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      frps: { ...config.frps, server_addr: e.target.value },
                    })
                  }
                  fullWidth
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
                <TextField
                  label="服务器端口"
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
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
                <TextField
                  label="认证密钥"
                  type="password"
                  value={config.frps.auth_token}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      frps: { ...config.frps, auth_token: e.target.value },
                    })
                  }
                  fullWidth
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      color: 'white',
                      '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                    },
                    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                  }}
                />
              </Box>
            </Paper>
          </Box>
        );

      case 'proxies':
        return (
          <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: 'white' }}>代理配置</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddProxy}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}
              >
                添加代理
              </Button>
            </Box>

            <List>
              {config.proxies.map((proxy, index) => (
                <Paper key={index} sx={{ mb: 2, p: 3, borderRadius: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <TextField
                      label="名称"
                      value={proxy.name}
                      onChange={(e) => handleProxyChange(index, "name", e.target.value)}
                      size="small"
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
                    />
                    <TextField
                      label="类型"
                      select
                      value={proxy.type}
                      onChange={(e) => handleProxyChange(index, "type", e.target.value)}
                      size="small"
                      sx={{ width: 120, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
                      slotProps={{ select: { native: true } }}
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="stcp">STCP</option>
                      <option value="http">HTTP</option>
                      <option value="https">HTTPS</option>
                    </TextField>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteProxy(index)}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(239, 68, 68, 0.1)',
                        '&:hover': {
                          bgcolor: 'rgba(239, 68, 68, 0.2)',
                        }
                      }}
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="本地地址"
                      value={proxy.local_ip}
                      onChange={(e) => handleProxyChange(index, "local_ip", e.target.value)}
                      size="small"
                      sx={{ flex: 1, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
                    />
                    <TextField
                      label="本地端口"
                      type="number"
                      value={proxy.local_port}
                      onChange={(e) => handleProxyChange(index, "local_port", parseInt(e.target.value) || 0)}
                      size="small"
                      sx={{ width: 120, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
                    />
                    <TextField
                      label="远程端口"
                      type="number"
                      value={proxy.remote_port || ""}
                      onChange={(e) => handleProxyChange(index, "remote_port", parseInt(e.target.value) || undefined)}
                      size="small"
                      sx={{ width: 120, '& .MuiOutlinedInput-root': { color: 'white', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' } }}
                    />
                  </Box>
                </Paper>
              ))}
              {config.proxies.length === 0 && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}>
                    暂无代理配置，点击"添加代理"开始
                  </Typography>
                </Paper>
              )}
            </List>
          </Box>
        );

      case 'settings':
        return (
          <Box sx={{ p: 4, maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3, color: 'white' }}>
              设置
            </Typography>
            <Paper sx={{ p: 4, borderRadius: 3, bgcolor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.05)' }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 500, color: 'white' }}>开机自启</Typography>
                  <Button
                    variant={autoLaunch ? "contained" : "outlined"}
                    onClick={() => handleAutoLaunchToggle(!autoLaunch)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                    }}
                  >
                    {autoLaunch ? "已启用" : "未启用"}
                  </Button>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<Upload />}
                    onClick={handleImportConfig}
                    sx={{ 
                      flex: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.7)',
                      borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    导入配置
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportConfig}
                    sx={{ 
                      flex: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 500,
                      color: 'rgba(255,255,255,0.7)',
                      borderColor: 'rgba(255,255,255,0.2)',
                    }}
                  >
                    导出配置
                  </Button>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSaveConfig}
                  disabled={isLoading}
                  sx={{ 
                    mt: 2,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  }}
                >
                  保存配置
                </Button>
              </Box>
            </Paper>
          </Box>
        );

      default:
        return (
          <HomePage
            isRunning={isRunning}
            isLoading={isLoading}
            onToggle={handleToggleService}
            onDownload={handleDownload}
          />
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* 顶部应用栏 */}
      <AppBar 
        position="static" 
        sx={{ 
          background: '#0f0f23',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
        <Toolbar sx={{ minHeight: '56px !important' }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ 
              mr: 2,
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.15)',
              }
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{ 
              fontWeight: 600,
              fontSize: '1.1rem',
              letterSpacing: '0.3px',
            }}
          >
            {currentPage === 'home' ? 'Frpc Manager' : 
             currentPage === 'server' ? '服务器配置' :
             currentPage === 'proxies' ? '代理配置' : '设置'}
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 侧边栏 */}
      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            height: '100%',
            background: '#1a1a2e',
            borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
          },
        }}
      >
        <Box sx={{ width: '100%' }} role="presentation">
          <MenuItem
            icon={<PowerSettingsNew />}
            text="首页"
            onClick={() => { setCurrentPage('home'); setDrawerOpen(false); }}
          />
          <MenuItem
            icon={<Settings />}
            text="服务器配置"
            onClick={() => { setCurrentPage('server'); setDrawerOpen(false); }}
          />
          <MenuItem
            icon={<Storage />}
            text="代理配置"
            onClick={() => { setCurrentPage('proxies'); setDrawerOpen(false); }}
          />
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
          <MenuItem
            icon={<ExitToApp />}
            text="设置"
            onClick={() => { setCurrentPage('settings'); setDrawerOpen(false); }}
          />
        </Box>
      </Drawer>

      {/* 主内容区 */}
      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'hidden',
          bgcolor: '#0f0f23',
          position: 'relative',
        }}
      >
        {renderPage()}
      </Box>

      {/* 消息提示 */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" onClose={() => setSnackbarOpen(false)}>
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default App;
