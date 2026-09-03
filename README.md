# War of the Five Kingdoms — a living, WebMCP-native strategy realm

A persistent, real-time strategy kingdom simulator built for ChatGPT Apps / WebMCP. Five rival kingdoms — armies, lords, diplomacy, economy, and a living world clock — run continuously in one canonical world state, playable either as a full visual strategy game in the browser, or entirely through natural-language MCP tool calls from inside ChatGPT.

## What makes this different

Most "AI game" demos are a chatbot narrating a static scene. This is a real simulation:

- **One canonical world state.** Every army, settlement, lord, treasury, order, battle and diplomatic agreement lives in a single in-memory `WorldState` (`lib/world/runtime.ts`). There is no separate "chat narrative" that can drift from "actual game state" — the MCP tools, the browser UI, and the AI-controlled kingdoms all read and mutate the exact same object.
- **The world runs on a real clock.** `lib/world/simulation.ts` advances world-minutes continuously, resolving marches, sieges, production, recruitment and battles deterministically, and only interrupts the clock to hand control back to a human or an LLM player when something meaningful happens (battle started, army arrived, enemy sighted, a new day begins, etc.) — see `types/session.ts`'s `CommandInterruptType`.
- **Every kingdom is actually played by someone.** At campaign start, each of the five kingdoms is assigned a control role (`lib/demo/realm-control.ts`): the human player, one rival controlled by a live "Actor LLM" (a separate OpenAI-backed strategic agent), and the rest run by a "GM" agent that role-plays every remaining ruler with the same tool access and the same fairness constraints as everyone else.
- **Fog of war is real, not decorative.** AI-controlled kingdoms only ever see what their own scouts, couriers and border contacts have actually delivered (`lib/session/knowledge.ts`) — the "CRITICAL FAIRNESS LAW" baked into every AI system prompt forbids exploiting omniscient world data.
- **WebMCP identity is cryptographically scoped, not model-trusted.** `lib/webmcp/identity-guard.ts` strips any session/player identifiers the model might try to pass and injects the browser's own bound identity directly before every tool executes — the model literally cannot address another kingdom's army or another player's character, by construction, not by prompt instruction.

## Architecture at a glance

```
app/
  page.tsx                 Mounts WebMCPProvider + DemoRuntime + GameRoot
  webmcp-provider.tsx       Registers every canonical gameplay tool with document.modelContext
  game-root.tsx             Menu -> intro -> live game shell
  strategy-map.tsx           Pannable/zoomable world map (armies, settlements, roads, terrain)
  operational-panel.tsx     Army orders: move, split, merge, commander assignment, battle tactics
  realm-command-panel.tsx   Turn/phase HUD, END ORDERS, live GM/AI decision feed
  settlement-investment-panel.tsx  Recruit, develop, fortify -- plus read-only intel on foreign settlements
  game-drawer.tsx           Messages, diplomacy, lords, AI decision feed, save/load

lib/
  world/            Canonical WorldState, the simulation clock, per-tick processors
  military/          Battle resolution, terrain/tactics, army management, recruitment
  session/            Command-cycle turn engine, player actions, knowledge/fog-of-war
  politics/           Audiences, promises, agreements, war declarations
  economy/            Production, trade, settlement development, road security
  actors/             The orchestrator that runs LLM/GM turns and advances the clock
  webmcp/              WebMCP tool registration (army, lords, politics, borders, war, map, audience)
  ai/                  Adapters that call the OpenAI-backed API routes for Player/GM/Director models

app/api/ai/
  player/, gm-realm/, gm-character/, gm-lord-order/, director-event/, director-proposals/
  -- each a small Responses-API route with a strict JSON schema and a hand-written
     strategic doctrine system prompt (defend when weak, act when strong, honor
     agreements, never idle turn after turn).
```

## How a turn actually works

1. The human plays through the visual UI or through WebMCP tool calls from ChatGPT -- both paths call the exact same canonical `lib/session/*` functions, so there is no special "AI path" vs "UI path".
2. After every mutating action, `runWorldCatchUp()` (`lib/actors/orchestrator.ts`) resolves the "executing" phase of the world clock and, in order, runs every AI-controlled kingdom's pending command window until control genuinely needs a human again or a safety guard is hit. This is the same function used by the WebMCP identity guard *and* the browser's own self-rescheduling driver loop (`app/demo-runtime.tsx`), so progress never depends on a particular tab staying focused.
3. Turn order is human player(s) first, then the Actor LLM, then every GM-controlled kingdom, each fully awaited in sequence -- nobody's turn starts before the previous one's model call has actually returned.
4. Every AI decision (tool calls, summaries, which kingdom, when) is recorded and surfaced live in the "Recent GM / AI Activity" feed on the Realm Command panel and the drawer's "AI Feed" tab, so the human player can see what every rival kingdom is doing even while they were not the one watching.

## Running it

```bash
npm install
npm run dev
```

Environment variables required: `OPENAI_API_KEY`, `PLAYER_LLM_MODEL`, `GM_CHARACTER_MODEL`, and either `GM_DIRECTOR_MODEL` or `OPENAI_DIRECTOR_MODEL`. There are no hard-coded model defaults on purpose -- a misconfigured deployment fails loudly at the API boundary instead of silently using a stale model id.

Open the app, pick a kingdom, and either play directly on the map, or connect it as a WebMCP host inside ChatGPT and command your kingdom in natural language -- army movement, diplomacy, recruitment, lord correspondence, audiences, and war are all exposed as canonical tools with identical rules to the visual game.
