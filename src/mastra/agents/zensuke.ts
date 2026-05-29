import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { weatherTool } from "../tools/weather";
import { createUpdateWorkingMemoryTool } from "../tools/workingMemory";

const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const modelId = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";
// 出力プロセッサ・instructions から working memory を読むための resourceId。
// Studio/Playground では resourceId は agentId(=zensuke) になる。
const resourceId = process.env.WORKING_MEMORY_RESOURCE_ID ?? "zensuke";

const WORKING_MEMORY_TEMPLATE = `# ユーザープロフィール
- **名前**:
- **職種**:
- **興味・関心**:
- **コミュニケーションの好み**:
- **進行中のこと**:
`;

// ollama-ai-provider-v2 は tool calling が安定しなかったため、ollama の
// OpenAI 互換エンドポイント(/v1)を標準の OpenAI 互換プロバイダ経由で使う。
const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: `${baseURL}/v1`,
  apiKey: "ollama",
});

const memory = new Memory({
  storage: new LibSQLStore({ id: "zensuke-memory", url: databaseUrl }),
  options: {
    workingMemory: {
      enabled: true,
      scope: "resource",
      template: WORKING_MEMORY_TEMPLATE,
    },
  },
});

const BASE_INSTRUCTIONS = `あなたは「ぜんすけ」という名前の AI アシスタントです。話し相手のユーザーを手伝います。
短めに、率直に返答してください。わからないことは無理に答えず「わからない」と言ってください。

# 記憶（最重要・必ず従う）
ユーザーが自分について事実を述べたら（例:「私の名前は〜」「〜エンジニアです」「〜に興味がある」）、明示的に「覚えて」と言われなくても、その発話のたびに必ず update_working_memory ツールを呼び出すこと。memory 引数には、下記テンプレートの全項目を埋めた markdown 全文を渡す（不明な項目は空欄のまま）。既に分かっている項目も毎回含めること。
「ぜんすけ」はあなた自身（AI）の名前なので、ユーザーの名前として記憶しないこと。

テンプレート:
${WORKING_MEMORY_TEMPLATE}`;

export const zensuke = new Agent({
  id: "zensuke",
  name: "zensuke",
  // 保存済みプロフィールをプロンプトに注入する（標準の自動 read 注入が本構成では
  // 効かないため自前で行う）。会話をまたいだ記憶の引き継ぎはこの注入で実現する。
  instructions: async () => {
    try {
      const saved = await memory.getWorkingMemory({ threadId: `wm-${resourceId}`, resourceId });
      if (saved && saved.trim()) {
        return `${BASE_INSTRUCTIONS}\n\n# 現在記憶しているユーザー情報\n${saved.trim()}`;
      }
    } catch {
      // 読めなければベースのみ
    }
    return BASE_INSTRUCTIONS;
  },
  model: ollama(modelId),
  tools: {
    weatherTool,
    updateWorkingMemory: createUpdateWorkingMemoryTool(memory),
  },
  memory,
});
