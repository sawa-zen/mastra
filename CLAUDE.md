# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

個人用の [Mastra](https://mastra.ai) ランタイム。agent 定義をホストするリポジトリ（現状 `zensuke` 1体）。日本語で対応すること。

## コマンド

```bash
npm install
npm run dev      # mastra dev → http://localhost:4111 で Playground 起動
npm run build    # mastra build → .mastra/output/index.mjs を生成
npm start        # node .mastra/output/index.mjs (本番モード)
npx tsc --noEmit # 型チェック（テスト/リント設定は無いのでこれが唯一の静的検査）
```

テストフレームワークは導入されていない。動作確認は `npm run dev` の Playground で行う。`.env` は `.env.example` からコピーして使う（`.env` は gitignore 済み）。

## アーキテクチャ

Mastra ランタイム。`src/mastra/index.ts` がエントリで `Mastra` インスタンスに agent を登録する。

- **agent**: `src/mastra/agents/`。`new Agent({ model, tools, memory })`。LLM は **`@ai-sdk/openai-compatible` 経由で Ollama の OpenAI 互換エンドポイント (`/v1`) を叩く**（`createOpenAICompatible({ baseURL: ".../v1" })`）。新しい agent は `index.ts` の `agents` マップに登録する。
- **tool**: `src/mastra/tools/`。`createTool({ id, inputSchema, outputSchema, execute })`（zod スキーマ）。agent の `tools` フィールドで登録する。
- **memory**: `@mastra/memory` + `LibSQLStore`（SQLite）。

### LibSQLStore が 2 つある点に注意
`index.ts`（Mastra 本体の storage = threads/messages）と `agents/zensuke.ts`（Memory の storage = working memory）で **別々の `LibSQLStore` インスタンス**を生成しているが、どちらも `DATABASE_URL` を参照するので同じファイルを共有する。`DATABASE_URL` が相対パス（`file:./db.sqlite`）だと実行ディレクトリ次第で別ファイルになるため、本番では絶対パス（hostPath）を使っている。

### ワーキングメモリ（自前実装している理由）
`zensuke` は `workingMemory: { scope: "resource" }`。`resourceId` をキーに `mastra_resources` テーブルへ保存され、会話をまたいで引き継がれる（Studio/Playground では `resourceId` の既定値は agentId=`zensuke`）。

**Mastra 標準の working memory（自動 `updateWorkingMemory` ツール＋自動 read 注入）が本構成では機能しなかった**ため、保存・読み出しとも自前で実装している:

- **保存**: `src/mastra/tools/workingMemory.ts` の自前 `updateWorkingMemory` ツール（`tools` に登録）。標準のメモリツールはなぜかモデルに渡らない（tools 一覧に出ない）が、`tools` 経由のツールは確実に渡るため。execute 内で `memory.updateWorkingMemory()` を直接呼ぶ。
- **読み出し（recall）**: `zensuke.ts` の `instructions`（関数）内で `memory.getWorkingMemory()` を読み、保存済みプロフィールを system プロンプトに自前で注入する。標準の自動注入も効かないため。

**provider は `ollama-ai-provider-v2` ではなく `@ai-sdk/openai-compatible`（ollama の `/v1`）を使うこと**。前者だとツール呼び出しが抑制され（0/5）、後者にすると gemma4:e2b でも tool calling が通る（~60%）。gemma は小型ゆえ呼び出し率は完璧ではなく、平叙文での自発呼び出しはプロンプトで強めに促している。

## デプロイ

- `main` への push で GitHub Actions（`.github/workflows/build.yml`）が **ネイティブ arm64 ランナー `ubuntu-24.04-arm`** で Docker ビルドし `ghcr.io/sawa-zen/mastra:latest` を push（パブリックリポジトリなので arm ランナーは無料・QEMU 不要）。
- k3s 上の **Keel** が `:latest` の digest 変化を 1 分ポーリングで検知し `mastra-server` / `mastra-studio` を自動 rollout。
- k8s マニフェストは別リポジトリ [larmia-k8s](https://github.com/sawa-zen/larmia-k8s) で管理。構成は **mastra-server**（ランタイム本体・ClusterIP・SQLite は hostPath `/var/lib/mastra` に永続化・`replicas: 1` / `strategy: Recreate`・node2 ピン留め）と **mastra-studio**（UI・stateless・Ingress で外部公開）の 2 デプロイ。Ollama は `ollama-personal`（node5）をクラスタ内通信で利用。

## 環境変数

| 変数 | デフォルト | 用途 |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama サーバ URL（末尾に `/api` は付けない） |
| `OLLAMA_MODEL` | `gemma4:e2b` | 使用モデル |
| `DATABASE_URL` | `file:./db.sqlite` | libsql(SQLite) の保存先 |
| `INSTRUCTIONS_PATH` | `/etc/zensuke/instructions.md` | zensuke の System Prompt ファイル。本番は ConfigMap でマウント。不在時はコード内のフォールバックを使う |
| `PORT` | `4111` | リッスンポート |
