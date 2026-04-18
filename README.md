# Marrakech

`roadmap.md` に沿って、既存の単一 HTML デモから `boardgame.io` ベースの構成へ段階的に移行するリポジトリです。

現時点の到達段階は `Phase 1 / Step 1` です。
今回の初回実装では、`Vite + React + TypeScript + boardgame.io` の最小起動環境を作成し、仮のゲーム状態表示と 1 つの move 実行を確認できるようにしました。

## 現在の内容

- React + TypeScript + Vite のフロントエンド雛形
- `boardgame.io` を使った最小プロトタイプゲーム
- `boardgame.io/server` を使ったローカル接続用サーバー
- 同じ `matchID` を使って複数タブで接続確認しやすい UI

## 使い方

依存関係をインストールします。

```bash
npm install
```

サーバーを起動します。

```bash
npm run dev:server
```

別ターミナルでクライアントを起動します。

```bash
npm run dev:client
```

ブラウザで `http://localhost:5173` を開き、別タブで同じ `Match ID` を使いながら `Player 0 / 1 / 2` を切り替えると、`Phase 1 / Step 1` の同期確認を進められます。

## 今後の予定

次の実装候補は `roadmap.md` に記載の以下です。

1. `Phase 2`: 型定義と `setup()` の本実装
2. `Phase 3`: 六角盤の座標ユーティリティとテスト
3. その後に move / phase の本実装へ移行
