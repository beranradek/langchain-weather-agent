import * as z from "zod";
import { createAgent, initChatModel, tool, type ToolRuntime } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { getWeatherForLocation } from "./tools/openMeteo.js";

const responseFormat = z.object({
  response: z
    .string()
    .describe("Friendly, helpful answer to the user. Use short paragraphs."),
  used_location: z
    .string()
    .optional()
    .describe("The location you used for the forecast (if any)."),
  weather_snapshot: z
    .object({
      temperature_c: z.number().optional(),
      humidity_percent: z.number().optional(),
      precipitation: z.number().optional(),
      wind_speed: z.number().optional(),
      conditions: z.string().optional(),
      observed_at: z.string().optional(),
    })
    .optional()
    .describe("A best-effort summary of the current conditions (if weather was requested)."),
});

type AgentContext = { default_location: string };
type AgentRuntime = ToolRuntime<unknown, AgentContext>;

const getUserLocation = tool(
  async (_: Record<string, never>, config: AgentRuntime) => {
    return config.context.default_location;
  },
  {
    name: "get_user_location",
    description:
      "Get the CLI user's default location (used when the user asks 'outside' / 'here' without specifying a city).",
    schema: z.object({}),
  }
);

const systemPrompt = `You are a helpful weather assistant.

You have access to two tools:
- get_weather_for_location: use it to retrieve current weather for a specific location.
- get_user_location: use it when the user asks about the weather "outside", "here", or otherwise implies their current location without naming it.

Rules:
- If the user asks for weather and no explicit location is provided, call get_user_location first.
- Always prefer calling tools over guessing.
- Keep answers concise and practical (what it's like + what to wear / expect).
- When you used weather data, include the used location and a short snapshot in structured output.`;

export async function createWeatherAgent() {
  const modelName = process.env.MODEL?.trim() || "gpt-4o-mini";

  const looksLikeAnthropic = modelName.startsWith("claude-");
  const looksLikeOpenAI =
    modelName.startsWith("gpt-") || modelName.startsWith("o1") || modelName.startsWith("o3");

  if (looksLikeAnthropic && !process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "MODEL looks like Anthropic (claude-*), but ANTHROPIC_API_KEY is not set. See .env.example."
    );
  }
  if (looksLikeOpenAI && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "MODEL looks like OpenAI (gpt-* / o1* / o3*), but OPENAI_API_KEY is not set. See .env.example."
    );
  }

  const temperature = Number(process.env.TEMPERATURE ?? "0");
  const maxTokens = Number(process.env.MAX_TOKENS ?? "800");
  const timeoutSeconds = Number(process.env.TIMEOUT_SECONDS ?? "30");

  const model = await initChatModel(modelName, {
    temperature: Number.isFinite(temperature) ? temperature : 0,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : 800,
    timeout: Number.isFinite(timeoutSeconds) ? timeoutSeconds : 30,
  });

  const checkpointer = new MemorySaver();

  return createAgent({
    model,
    systemPrompt,
    responseFormat,
    checkpointer,
    tools: [getUserLocation, getWeatherForLocation],
  });
}

export type WeatherAgent = Awaited<ReturnType<typeof createWeatherAgent>>;
