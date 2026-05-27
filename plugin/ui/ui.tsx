import * as React from "react";
import ReactDOM from "react-dom/client";
import "./main.base.css";
import "./main.theme.css";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { io } from "socket.io-client";
import { emit, on } from "@create-figma-plugin/utilities";
import {
  StartTaskHandler,
  TaskFinishedHandler,
  TaskFailedHandler,
  ResizeUIHandler,
} from "../main/types";
import { useEffect, useRef } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import Logs from "./components/mui/Logs";

const EXPANDED_HEIGHT = 320;
const COLLAPSED_HEIGHT = 44;
const WIDTH = 300;

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#2c2c2c", paper: "#383838" },
    text: { primary: "rgba(255,255,255,1)", secondary: "rgba(255,255,255,0.7)" },
    divider: "#444444",
  },
  typography: { fontFamily: "Inter, sans-serif", fontSize: 11 },
});

function Plugin(props: any) {
  const [connected, setConnected] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const addLogRef = useRef<((log: string) => void) | null>(null);

  useEffect(() => {
    document.body.classList.add("figma-dark");
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    emit<ResizeUIHandler>("RESIZE_UI", {
      width: WIDTH,
      height: next ? COLLAPSED_HEIGHT : EXPANDED_HEIGHT,
    });
  };

  useEffect(() => {
    const socket = io("ws://localhost:38450", {
      transports: ["websocket", "polling"],
      upgrade: true,
      rememberUpgrade: false,
    });
    socket.on("connect", () => {
      addLogRef.current?.("Connected to MCP server");
      setConnected(true);
    });
    socket.on("disconnect", () => {
      addLogRef.current?.("Disconnected from MCP server");
      setConnected(false);
    });
    socket.on("start-task", (task: any) => {
      emit<StartTaskHandler>("START_TASK", {
        taskId: task.id,
        command: task.command,
        args: task.args,
      });
      addLogRef.current?.(`→ ${task.command}`);
    });
    on<TaskFinishedHandler>("TASK_FINISHED", (task: TaskFinishedHandler) => {
      socket.emit("task-finished", task);
      addLogRef.current?.(`✓ done`);
    });
    on<TaskFailedHandler>("TASK_FAILED", (task: TaskFailedHandler) => {
      socket.emit("task-failed", task);
      addLogRef.current?.(`✗ failed: ${task.content}`);
    });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: "Inter, sans-serif",
        backgroundColor: "var(--figma-color-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: 44,
          flexShrink: 0,
          borderBottom: collapsed ? "none" : "1px solid var(--figma-color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: connected ? "#1BC47D" : "#F24822",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--figma-color-text)",
            }}
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px 6px",
            borderRadius: 4,
            color: "var(--figma-color-text-secondary)",
            fontSize: 16,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {collapsed ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </button>
      </div>

      {/* Logs */}
      <div style={{ flex: 1, minHeight: 0, padding: "8px 12px 12px", display: collapsed ? "none" : "flex", flexDirection: "column" }}>
        <Logs onAddLogRef={addLogRef} />
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
//@ts-ignore
const root = ReactDOM.createRoot(rootElement);
const dataElement = document.getElementById("data");
root.render(
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <Plugin {...(dataElement?.dataset || {})} />
  </ThemeProvider>
);
export default root;
