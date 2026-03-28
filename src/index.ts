import "dotenv/config";
import { randomUUID } from "node:crypto";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";
import { createWeatherAgent } from "./agent.js";

function isDebug(): boolean {
  return process.env.DEBUG === "1" || process.env.DEBUG?.toLowerCase() === "true";
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function getArgPrompt(argv: string[]): string | undefined {
  const args = argv.slice(2);
  if (args.length === 0) return undefined;
  if (args[0] === "-h" || args[0] === "--help") return "__HELP__";
  return args.join(" ").trim() || undefined;
}

function defaultLocationFromEnv(): string {
  return process.env.DEFAULT_LOCATION?.trim() || "Prague";
}

async function runOnce(prompt: string) {
  const agent = await createWeatherAgent();
  const threadId = randomUUID();

  const config = {
    configurable: { thread_id: threadId },
    context: { default_location: defaultLocationFromEnv() },
  };

  try {
    const response = await agent.invoke(
      { messages: [{ role: "user", content: prompt }] },
      config
    );
    console.log(JSON.stringify(response.structuredResponse, null, 2));
  } catch (err) {
    console.error(`Error: ${formatErrorMessage(err)}`);
    if (isDebug()) console.error(err);
    process.exitCode = 1;
  }
}

async function runInteractive() {
  const agent = await createWeatherAgent();
  const rl = readline.createInterface({ input, output });
  const threadId = randomUUID();

  const config = {
    configurable: { thread_id: threadId },
    context: { default_location: defaultLocationFromEnv() },
  };

  console.log("LangChain Weather Agent (type 'exit' to quit)");
  console.log(`Default location: ${config.context.default_location}`);
  console.log();

  while (true) {
    let line: string;
    try {
      line = (await rl.question("> ")).trim();
    } catch (err) {
      // EOF / closed stdin: exit cleanly.
      if (isDebug()) console.error(err);
      break;
    }
    if (!line) continue;
    if (line === "exit" || line === "quit") break;

    try {
      const response = await agent.invoke(
        { messages: [{ role: "user", content: line }] },
        config
      );
      console.log(JSON.stringify(response.structuredResponse, null, 2));
    } catch (err) {
      console.error(`Error: ${formatErrorMessage(err)}`);
      if (isDebug()) console.error(err);
    }
  }

  rl.close();
}

async function main() {
  const prompt = getArgPrompt(process.argv);
  if (prompt === "__HELP__") {
    console.log("Usage:");
    console.log("  npm run dev -- \"What's the weather in Tokyo?\"");
    console.log("  npm run build && npm start -- \"What's the weather outside?\"");
    console.log();
    console.log("Interactive mode:");
    console.log("  npm run dev");
    return;
  }
  if (prompt) return runOnce(prompt);
  return runInteractive();
}

try {
  await main();
} catch (err) {
  console.error(`Error: ${formatErrorMessage(err)}`);
  if (isDebug()) console.error(err);
  process.exitCode = 1;
}
