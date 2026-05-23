import { createTheme } from "@mui/material";

export type ThemeMode = "dark" | "light";

const darkCssVars = `
  --bg-app: #0c0c1d;
  --bg-sidebar: #10102a;
  --bg-content: #0c0c1d;
  --bg-card: #161636;
  --bg-card-hover: #1c1c42;
  --bg-input: #1a1a3a;
  --border: rgba(99, 102, 241, 0.12);
  --border-light: rgba(255, 255, 255, 0.06);
  --text-primary: #e2e2f0;
  --text-secondary: rgba(226, 226, 240, 0.55);
  --text-muted: rgba(226, 226, 240, 0.3);
  --accent: #6366f1;
  --accent-hover: #7577f5;
  --accent-glow: rgba(99, 102, 241, 0.25);
  --success: #10b981;
  --success-glow: rgba(16, 185, 129, 0.3);
  --danger: #ef4444;
  --danger-glow: rgba(239, 68, 68, 0.3);
`;

const lightCssVars = `
  --bg-app: #f5f5fa;
  --bg-sidebar: #ffffff;
  --bg-content: #f5f5fa;
  --bg-card: #ffffff;
  --bg-card-hover: #f0f0f8;
  --bg-input: #f0f0f8;
  --border: rgba(99, 102, 241, 0.15);
  --border-light: rgba(0, 0, 0, 0.06);
  --text-primary: #1a1a2e;
  --text-secondary: rgba(26, 26, 46, 0.6);
  --text-muted: rgba(26, 26, 46, 0.35);
  --accent: #6366f1;
  --accent-hover: #4f46e5;
  --accent-glow: rgba(99, 102, 241, 0.15);
  --success: #059669;
  --success-glow: rgba(5, 150, 105, 0.2);
  --danger: #dc2626;
  --danger-glow: rgba(220, 38, 38, 0.2);
`;

export function getCssVars(mode: ThemeMode): string {
  return `
    :root {
      ${mode === "dark" ? darkCssVars : lightCssVars}
      --sidebar-w: 220px;
      --toolbar-h: 52px;
    }
  `;
}

export function createAppTheme(mode: ThemeMode) {
  if (mode === "light") {
    return createTheme({
      palette: {
        mode: "light",
        background: {
          default: "#f5f5fa",
          paper: "#ffffff",
        },
        primary: { main: "#6366f1" },
      },
    });
  }
  return createTheme({
    palette: {
      mode: "dark",
      background: {
        default: "#0c0c1d",
        paper: "#161636",
      },
      primary: { main: "#6366f1" },
    },
  });
}
