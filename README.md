# Figma MCP Server

[![Community Figma MCP server - Allow AI Agents to help you with Figma designs! | Product Hunt](https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=1056256&theme=light&period=daily&t=1767540612947)](https://www.producthunt.com/products/community-figma-mcp-server?embed=true&utm_source=badge-top-post-badge&utm_medium=badge&utm_campaign=badge-community-figma-mcp-server)

## Why this exists

Figma has an official MCP endpoint that tools like Cursor, Claude, and Windsurf can connect to. The problem is it's **read-only** — the AI can inspect your designs but can't create or change anything.

The only way to actually modify a Figma document programmatically is through their plugin system, which runs inside the Figma app itself. This project bridges that gap: a plugin runs inside Figma with full edit permissions, and a local server acts as the go-between for your AI agent. The AI talks to the server, the server talks to the plugin, the plugin edits your document.

**The short version:** Figma's official MCP lets AI see your designs. This lets AI actually build them.

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/) installed
- A Figma account

### First time only

**1. Clone the repo**
```bash
git clone https://github.com/klaircodes/figma-mcp-server.git
cd figma-mcp-server
```

**2. Install dependencies and build**
```bash
npm run setup
```

**3. Import the plugin into Figma**
1. Open Figma and open the document you want to work with
2. Go to **Plugins** > **Development** > **Import plugin from manifest**
3. Select `plugin/manifest.json` from this repo
4. The plugin is now saved — you only need to do this once

### Every session

**1. Start the MCP server**
```bash
npm start
```

**2. Open the plugin in Figma**
Go to **Plugins** > **Development** > **Figma MCP Server**

The plugin will show a green dot and "Connected" once the server is running.

**3. Configure your AI client**

Add the following to your MCP client config (Cursor, Claude Code, Windsurf, etc.):

```json
{
  "mcpServers": {
    "figma": {
      "url": "http://localhost:38450/mcp"
    }
  }
}
```

You're ready. Ask your AI agent to build something in Figma.

## Example prompts

```
Design a mobile app home screen (390×844) for a fitness tracking app called Pulse.
Include a greeting header, a stats row with 3 cards (steps, calories, active minutes),
a Today's Workouts section with 2 workout cards, and a bottom nav bar with 4 items.
Use a dark background with a blue accent color.
```

```
Create a dashboard (1440×900) for a proposal management tool. Dark left sidebar nav,
top bar with user avatar, 3 KPI cards (Active Proposals, Win Rate, Avg Deal Size),
and a table below with 4 recent proposals showing client name, status, value, and date.
```

## How it works

The plugin and server communicate over a WebSocket connection:

1. Your AI agent sends a tool call to the local MCP server
2. The server queues the task and forwards it to the plugin via WebSocket
3. The plugin executes the action inside Figma using the Plugin API
4. The result is returned back through the same path to your AI agent

The plugin must stay open while the AI is working — it's the only thing with permission to edit your document.

![Architecture](doc/figma-mcp-architecture.png)
![Sequence](doc/figma-mcp-sequence.svg)

## Development

**MCP server**
```bash
cd mcp && npm run dev
```

**Plugin**
```bash
cd plugin && npm run dev
```
Then import `plugin/manifest.json` in Figma and start the plugin.

**MCP Inspector**
```bash
cd mcp && npm run inspector
# Connect to http://127.0.0.1:38450/mcp
```

## Security

The plugin and server only communicate locally — nothing leaves your machine. The server binds to `localhost:38450` and is not exposed to the network by default.

If you expose it externally, do so at your own risk.

## Alternatives

If read-only access is enough for your use case, the [official Figma MCP server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server) is simpler to set up.
