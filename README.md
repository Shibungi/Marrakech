# Marrakech

`roadmap.md` に沿って、既存の単一 HTML デモから `boardgame.io` ベースの構成へ段階的に移行するリポジトリです。

現在の実装進捗や今後のタスクは `roadmap.md` に集約しています。

## 現在の内容

- React + TypeScript + Vite のフロントエンド
- `boardgame.io` を使ったゲーム定義（本実装の `MarrakechState` 型）
- `boardgame.io/server` を使ったローカル接続用サーバー
- 六角形マップ（7 段: 4-5-6-7-6-5-4）の座標ユーティリティ
- `setup()` による仕様どおりの初期状態生成
- 盤面・アッサム・プレイヤー情報を表示する UI
- Vitest によるユニットテスト（hex ユーティリティ・setup）

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

テストを実行します。

```bash
npm test
```

ブラウザで `http://localhost:5173` を開き、別タブで同じ `Match ID` を使いながら `Player 0 / 1 / 2` を切り替えると、盤面・アッサム・所持金の同期を確認できます。
