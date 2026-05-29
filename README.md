# mastra

個人用の [Mastra](https://mastra.ai) ランタイム。agent 定義をホストするリポジトリ。現状は `zensuke` という 1 つの agent を定義している。

## アーキテクチャ

- フレームワーク: Mastra
- LLM バックエンド: gemma4:e2b (Ollama on larmia-node5、約 2 tok/s)
- メモリ: libsql / SQLite (`db.sqlite`)
- デプロイ先: larmia-k3s クラスタ (larmia-node2 にピン留め)
- image: `ghcr.io/sawa-zen/mastra:latest` (private)
- アクセス UI: [Mastra Studio](https://mastra.ai/docs/getting-started/studio) を別 Pod で立てる

k8s マニフェストは [larmia-k8s](https://github.com/sawa-zen/larmia-k8s) で管理。

## 登録されている agent

- **zensuke**: さわの相棒 AI。くだけた口調、短めの返答が特徴。memory 永続化あり。

## ローカル開発

```bash
cp .env.example .env  # 必要に応じて編集
npm install
npm run dev           # http://localhost:4111 で Mastra Playground が起動
```

## ビルド

```bash
npm run build   # → .mastra/output/index.mjs が生成される
npm start       # → http://localhost:4111 で本番モード起動
```

## Docker

main push で GitHub Actions が ARM64 ビルドして `ghcr.io/sawa-zen/mastra:latest` を更新する。

## 環境変数

| 変数 | デフォルト | 用途 |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama サーバの URL (末尾に `/api` は付けない) |
| `OLLAMA_MODEL` | `gemma4:e2b` | 使用モデル |
| `DATABASE_URL` | `file:./db.sqlite` | libsql (SQLite) の保存先 |
| `INSTRUCTIONS_PATH` | `/etc/zensuke/instructions.md` | zensuke の System Prompt ファイル。本番は ConfigMap でマウント。不在時はコード内のフォールバックを使う |
| `PORT` | `4111` | リッスンポート |
