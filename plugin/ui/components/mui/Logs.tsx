import React from "react";
import { useState, useEffect, useRef } from "react";
import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";

const ScrollableContainer = styled(Box)<{ hasLogs: boolean }>`
  flex: 1;
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: ${({ hasLogs }) => hasLogs ? "var(--figma-color-bg-secondary)" : "transparent"};
  border: ${({ hasLogs }) => hasLogs ? "1px solid var(--figma-color-border)" : "none"};
  border-radius: 6px;
  box-sizing: border-box;
  padding: 6px 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--figma-color-border);
    border-radius: 4px;
  }
  scrollbar-width: thin;
  scrollbar-color: var(--figma-color-border) transparent;
`;

type LogEntry = { time: string; text: string };

function entryColor(text: string): string {
  if (text.startsWith("✓")) return "#1BC47D";
  if (text.startsWith("✗")) return "#F24822";
  if (text.startsWith("→")) return "var(--figma-color-text-secondary)";
  return "var(--figma-color-text)";
}

export type LogsProps = {
  onAddLogRef?: React.MutableRefObject<((log: string) => void) | null>;
};

export default function Logs({ onAddLogRef }: LogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (containerRef.current && logs.length > prevLengthRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
    prevLengthRef.current = logs.length;
  }, [logs]);

  useEffect(() => {
    if (onAddLogRef) {
      onAddLogRef.current = (text: string) => {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
        setLogs((prev) => [...prev, { time, text }]);
      };
    }
    return () => {
      if (onAddLogRef) onAddLogRef.current = null;
    };
  }, [onAddLogRef]);

  return (
    <ScrollableContainer ref={containerRef} hasLogs={logs.length > 0}>
      {logs.length === 0 ? (
        <div
          style={{
            padding: "12px",
            fontSize: 11,
            color: "var(--figma-color-text-tertiary)",
            fontStyle: "italic",
          }}
        >
          Waiting for tasks...
        </div>
      ) : (
        logs.map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              padding: "3px 10px",
              fontSize: 11,
              lineHeight: "16px",
              fontFamily: "monospace",
            }}
          >
            <span style={{ color: "var(--figma-color-text-tertiary)", flexShrink: 0 }}>
              {entry.time}
            </span>
            <span style={{ color: entryColor(entry.text), wordBreak: "break-word" }}>
              {entry.text}
            </span>
          </div>
        ))
      )}
    </ScrollableContainer>
  );
}
