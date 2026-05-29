import { createTool } from "@mastra/core/tools";
import type { Memory } from "@mastra/memory";
import { z } from "zod";

/**
 * 標準の Mastra working memory ツール (updateWorkingMemory) は本構成ではモデルに
 * 提供されない（Mastra 側の配線で tools 一覧に出てこない）。そこで同等のツールを
 * 自前で `tools` に登録してモデルへ確実に渡す。`tools` 経由のツールは
 * ollama-ai-provider-v2 の chat 経路で gemma が markdown 全文を引数に取って
 * 構造化呼び出しできることを確認済み。
 *
 * memory フィールドにプロフィールの markdown 全文を受け取り、resource スコープの
 * working memory として保存する。resourceId は tool 実行コンテキストから取得し、
 * 取れない場合は WORKING_MEMORY_RESOURCE_ID（既定 zensuke）にフォールバックする。
 */
export function createUpdateWorkingMemoryTool(memory: Memory) {
  return createTool({
    id: "update_working_memory",
    description:
      "ユーザーについて分かったことを記憶する。memory にプロフィールの markdown 全文（テンプレートの全項目を含む）を渡す。",
    inputSchema: z.object({
      memory: z.string().describe("保存するプロフィールの markdown 全文"),
    }),
    outputSchema: z.object({ saved: z.boolean() }),
    execute: async (input, ctx) => {
      const content = input.memory?.trim();
      if (!content) return { saved: false };

      const threadId = ctx?.agent?.threadId ?? "wm";
      const resourceId =
        ctx?.agent?.resourceId ?? process.env.WORKING_MEMORY_RESOURCE_ID ?? "zensuke";

      await memory.updateWorkingMemory({
        threadId,
        resourceId,
        workingMemory: content,
      });
      return { saved: true };
    },
  });
}
