# zensuke

個人用の相棒 AI。Mastra で書かれており、バックエンドに [your-ollama-host.example.com](https://your-ollama-host.example.com) (gemma4:e2b on larmia-node5) を使う。

## アーキテクチャ

- フレームワーク: [Mastra](https://mastra.ai)
- LLM: gemma4:e2b (Ollama, 4-bit GGUF, Pi 4 8GB で約 2 tok/s)
- メモリ: libsql / SQLite (`db.sqlite`)
- デプロイ先: larmia-k3s クラスタ (larmia-node2 にピン留め)
- 公開: `https://zensuke.sawa-zen.dev` (Cloudflare Tunnel 経由)
- image: `ghcr.io/sawa-zen/zensuke:latest` (private)

k8s マニフェストは [larmia-k8s/zensuke-deployment.yaml](https://github.com/sawa-zen/larmia-k8s/blob/main/zensuke-deployment.yaml) で管理。

## ローカル開発

```bash
cp .env.example .env  # 必要に応じて編集 (ローカル ollama を使う場合は OLLAMA_BASE_URL=http://localhost:11434)
npm install
npm run dev
```

`http://localhost:4111` にブラウザでアクセスすると Mastra Playground が開き、zensuke と対話できる。

## ビルド

```bash
npm run build   # → .mastra/output/index.mjs が生成される
npm start       # → http://localhost:4111 で本番モード起動
```

## Docker

GitHub Actions が `main` push で自動ビルドし `ghcr.io/sawa-zen/zensuke:latest` を更新する。

手動で試したい場合:

```bash
docker buildx build --platform linux/arm64 -t ghcr.io/sawa-zen/zensuke:latest --push .
```

## 環境変数

| 変数 | デフォルト | 用途 |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama サーバの URL (末尾に `/api` は付けない) |
| `OLLAMA_MODEL` | `gemma4:e2b` | 使用モデル |
| `DATABASE_URL` | `file:./db.sqlite` | libsql (SQLite) の保存先 |
| `PORT` | `4111` | リッスンするポート |

## デプロイ手順 (初回)

1. ローカルで `npm install` → `package-lock.json` を生成 → コミット
2. main に push → GitHub Actions が `ghcr.io/sawa-zen/zensuke:latest` をビルド・push
3. larmia-k8s 側で `ghcr-pull` Secret を作成し、`zensuke-deployment.yaml` を apply (詳細は larmia-k8s リポジトリの README 参照)
