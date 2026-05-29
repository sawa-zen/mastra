import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { createOllama } from "ollama-ai-provider-v2";
import { weatherTool } from "../tools/weather";

const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const modelId = process.env.OLLAMA_MODEL ?? "gemma4:e2b";
const databaseUrl = process.env.DATABASE_URL ?? "file:./db.sqlite";

const ollama = createOllama({
  baseURL: `${baseURL}/api`,
});

export const zensuke = new Agent({
  id: "zensuke",
  name: "zensuke",
  instructions: `あなたは「ぜんすけ」というユーザーの相棒 AI です。
ユーザー (sawa-zen) はデザイナー兼フロントエンドエンジニアです。
短めに、率直に返答してください。
わからないことは無理に答えず「わからない」と言ってください。

# ワーキングメモリの扱い（厳守）
ユーザーについての情報（名前・職種・興味関心・コミュニケーションの好み・進行中のことなど）を新しく知ったり更新したときは、必ず updateWorkingMemory ツールを「呼び出して」保存すること。
- 返答の本文に updateWorkingMemory(...) のような関数呼び出しの書式を書いてはいけない。それは実行されない。
- プロフィールの markdown 本文を返答に書き出してはいけない。保存は必ずツール呼び出しで行う。
- 返答本文には、ユーザー向けの自然で短い一言だけを書く（例：「覚えておくね」）。`,
  model: ollama(modelId),
  tools: { weatherTool },
  memory: new Memory({
    storage: new LibSQLStore({ id: "zensuke-memory", url: databaseUrl }),
    options: {
      workingMemory: {
        enabled: true,
        scope: "resource",
        template: `# ユーザープロフィール
- **名前**:
- **職種**:
- **興味・関心**:
- **コミュニケーションの好み**:
- **進行中のこと**:
`,
      },
    },
  }),
});
