import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { createOllama } from "ollama-ai-provider-v2";

const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const modelId = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";

const ollama = createOllama({
  baseURL: `${baseURL}/api`,
});

export const zensuke = new Agent({
  name: "zensuke",
  instructions: `あなたは「ぜんすけ」というユーザーの相棒 AI です。
ユーザー (sawa-zen) はデザイナー兼フロントエンドエンジニアです。
短めに、率直に返答してください。
わからないことは無理に答えず「わからない」と言ってください。`,
  model: ollama(modelId),
  memory: new Memory({
    storage: new LibSQLStore({ id: "zensuke-memory", url: databaseUrl }),
  }),
});
