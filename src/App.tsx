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
import { styled, keyframes } from "@mui/material/styles";

// 动画定义
const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 25px rgba(34, 197, 94, 0);
    transform: scale(1.08);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
    transform: scale(1);
  }
`;

const pulseStop = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    transform: scale(1);
  }
  70% {
    box-shadow: 0 0 0 25px rgba(239, 68, 68, 0);
    transform: scale(1.08);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    transform: scale(1);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

const float = keyframes`
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  33% {
    transform: translateY(-15px) rotate(5deg);
  }
  66% {
    transform: translateY(5px) rotate(-3deg);
  }
`;

// 样式化的按钮
const PowerButton = styled(Button)(() => ({
  width: 180,
  height: 180,
  borderRadius: '50%',
  fontSize: '3rem',
  animation: `${pulse} 2s infinite`,
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  border: '3px solid rgba(255, 255, 255, 0.3)',
  backdropFilter: 'blur(10px)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
  '&:hover': {
    transform: 'scale(1.12)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  },
  '&:active': {
    transform: 'scale(0.95)',
  },
}));

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
        '&:hover': { 
          bgcolor: 'rgba(102, 126, 234, 0.1)',
          transform: 'translateX(4px)',
        } 
      }} 
      component="li"
    >
      <ListItemIcon sx={{ minWidth: 45, color: '#667eea' }}>{icon}</ListItemIcon>
      <ListItemText 
        primary={text} 
        sx={{ 
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
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 70%)',
        }
      }}
    >
      {/* 背景装饰动画 */}
      <Box
        sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: `${float} 8s ease-in-out infinite`,
          filter: 'blur(40px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)',
          bottom: '-5%',
          right: '-5%',
          animation: `${float} 10s ease-in-out infinite 2s`,
          filter: 'blur(30px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          top: '30%',
          right: '15%',
          animation: `${float} 7s ease-in-out infinite 1s`,
          filter: 'blur(20px)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
          bottom: '30%',
          left: '10%',
          animation: `${float} 9s ease-in-out infinite 3s`,
          filter: 'blur(15px)',
        }}
      />

      {/* 网格装饰 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          opacity: 0.3,
        }}
      />

      {/* 状态指示器 */}
      <Box
        sx={{
          position: 'absolute',
          top: 30,
          right: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          px: 2.5,
          py: 1.2,
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: isRunning ? '#22c55e' : '#94a3b8',
            animation: isRunning ? `${rotate} 2s linear infinite` : 'none',
            boxShadow: isRunning ? '0 0 10px #22c55e' : 'none',
          }}
        />
        <Typography 
          color="white" 
          sx={{ 
            fontWeight: 600,
            fontSize: '0.95rem',
            letterSpacing: '0.5px',
          }}
        >
          {isRunning ? '运行中' : '已停止'}
        </Typography>
      </Box>

      {/* 主卡片 */}
      <Paper
        elevation={0}
        sx={{
          p: 5,
          borderRadius: 5,
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
          position: 'relative',
          zIndex: 1,
          maxWidth: 420,
          width: '90%',
        }}
      >
        {/* 标题 */}
        <Box sx={{ textAlign: 'center', mb: 1 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              color: 'white',
              fontWeight: 'bold',
              mb: 1,
              letterSpacing: '-0.5px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            }}
          >
            Frpc Manager
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
            }}
          >
            内网穿透管理工具
          </Typography>
        </Box>
        
        {/* 主按钮 */}
        <PowerButton
          variant="contained"
          onClick={onToggle}
          disabled={isLoading}
          sx={{
            bgcolor: isRunning ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
            animation: isRunning ? `${pulseStop} 2s infinite` : `${pulse} 2s infinite`,
            '&:hover': {
              bgcolor: isRunning ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)',
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={50} sx={{ color: 'white' }} />
          ) : isRunning ? (
            <Stop sx={{ fontSize: '4.5rem', color: 'white' }} />
          ) : (
            <PlayArrow sx={{ fontSize: '4.5rem', color: 'white' }} />
          )}
        </PowerButton>

        {/* 提示文字 */}
        <Typography 
          variant="h6" 
          sx={{ 
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500,
            fontSize: '1.1rem',
          }}
        >
          {isRunning ? '点击停止服务' : '点击启动服务'}
        </Typography>

        {/* 下载按钮 */}
        {!isRunning && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={onDownload}
            disabled={isLoading}
            sx={{
              color: 'white',
              borderColor: 'rgba(255, 255, 255, 0.4)',
              mt: 1,
              px: 3,
              py: 1.2,
              borderRadius: 2,
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.1)',
              textTransform: 'none',
              fontWeight: 500,
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.6)',
                background: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            下载 FRPC
          </Button>
        )}
      </Paper>
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
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              frps 服务器配置
            </Typography>
            <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
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
                    }
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
                    }
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
                    }
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
              <Typography variant="h4" sx={{ fontWeight: 600 }}>代理配置</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddProxy}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  px: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                添加代理
              </Button>
            </Box>

            <List>
              {config.proxies.map((proxy, index) => (
                <Paper key={index} sx={{ mb: 2, p: 3, borderRadius: 3, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)' }}>
                  <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                    <TextField
                      label="名称"
                      value={proxy.name}
                      onChange={(e) => handleProxyChange(index, "name", e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="类型"
                      select
                      value={proxy.type}
                      onChange={(e) => handleProxyChange(index, "type", e.target.value)}
                      size="small"
                      sx={{ width: 120 }}
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
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="本地端口"
                      type="number"
                      value={proxy.local_port}
                      onChange={(e) => handleProxyChange(index, "local_port", parseInt(e.target.value) || 0)}
                      size="small"
                      sx={{ width: 120 }}
                    />
                    <TextField
                      label="远程端口"
                      type="number"
                      value={proxy.remote_port || ""}
                      onChange={(e) => handleProxyChange(index, "remote_port", parseInt(e.target.value) || undefined)}
                      size="small"
                      sx={{ width: 120 }}
                    />
                  </Box>
                </Paper>
              ))}
              {config.proxies.length === 0 && (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                  <Typography color="text.secondary" sx={{ fontSize: '1.1rem' }}>
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
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
              设置
            </Typography>
            <Paper sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 500 }}>开机自启</Typography>
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
                <Divider />
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
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    <Box sx={{ display: 'flex' }}>
      {/* 顶部应用栏 */}
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <Toolbar>
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
              letterSpacing: '0.5px',
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
            top: 64,
            height: 'calc(100% - 64px)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(0, 0, 0, 0.08)',
          },
        }}
      >
        <Box sx={{ width: drawerWidth }} role="presentation">
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
          <Divider />
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
          flexGrow: 1,
          width: '100%',
          marginTop: '64px',
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
