# langchain-weather-agent

A small, production-style **LangChain (TypeScript)** console agent that can call real tools to fetch weather data (via **Open-Meteo**, no API key required for the weather API).

This repo is intentionally simple and educational, following the structure shown in the LangChain JS docs (agent + tools + model init + optional memory + structured output).

## Requirements

- Node.js 20+ (recommended: Node 22+)
- An LLM API key for the model you choose (e.g. `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and set:

- `MODEL` (e.g. `gpt-4o-mini` or `claude-sonnet-4-6`)
- the matching provider key (`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`)
- optionally `DEFAULT_LOCATION`

## Run

One-shot:

```bash
npm run dev -- \"What's the weather in Tokyo?\"
```

Interactive:

```bash
npm run dev
```

Build + run:

```bash
npm run build
npm start -- \"What's the weather outside?\"
```

## What it does

- Provides two tools:
  - `get_weather_for_location` (real current weather via Open-Meteo)
  - `get_user_location` (returns the CLI user's default location from runtime context)
- Uses `createAgent(...)` + `tool(...)` + `initChatModel(...)`
- Returns **structured output** (Zod schema) so you can depend on predictable fields
- Keeps **short-term memory** using `MemorySaver` (per `thread_id`) during an interactive session

## References

- LangChain JS overview: https://docs.langchain.com/oss/javascript/langchain/overview
- LangChain JS quickstart: https://docs.langchain.com/oss/javascript/langchain/quickstart
- Weather data: https://open-meteo.com/
