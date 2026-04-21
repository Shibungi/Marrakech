# Marrakech

`roadmap.md` に沿って、既存の単一 HTML デモから `boardgame.io` ベースの構成へ段階的に移行するリポジトリです。

現在の実装進捗や今後のタスクは `roadmap.md` に集約しています。

## 現在の内容

- React + TypeScript + Vite のフロントエンド
- `boardgame.io` を使ったゲーム定義（本実装の `MarrakechState` 型）
- `boardgame.io/server` を使ったローカル接続用サーバー
- LAN / インターネット公開を切り替えられる URL 設定
- 六角形マップ（7 段: 4-5-6-7-6-5-4）の座標ユーティリティ
- `setup()` による仕様どおりの初期状態生成
- 盤面・アッサム・プレイヤー情報を表示する UI
- Vitest によるユニットテスト（hex ユーティリティ・setup）

## 現在実装しているルール

この節は、2026-04-21 時点で実装されている挙動を整理したメモです。正式ルールの確定版ではなく、UI やルール調整の基準として使う想定です。

### 基本構成

- プレイヤー数は 3 人です（A / B / C）。
- 盤面は六角形マップ 7 段で、マス数は `4-5-6-7-6-5-4` です。
- 各プレイヤーの初期所持金は 30 コインです。
- 各プレイヤーは `sea` / `forest` / `city` の 3 地形を、それぞれ 4 枚ずつ持って開始します。
- アッサムは初期位置 `(3,3)`、初期方向 `NE` で開始します。

### 1 手番の流れ

1. 手番プレイヤーは、アッサムの隣接マスを 1 つ選んで向きを決めます。
2. その後、アッサムはランダムで 1〜3 マス進みます。
3. 盤外へ出そうになった場合は、その地点から進める別方向をランダムに選んで進行を続けます。
4. 着地先にタイルがある場合、着地したタイルと同じ `地形` で連結している成分を調べ、その中で各プレイヤーが持つタイル枚数を数えます。
5. 着地したプレイヤーより枚数が多い各プレイヤーに対して、枚数差ぶんのコインを支払います。同数以下のプレイヤーには支払いません。
6. 支払い額が所持金を超える場合は、払えるだけ全額を支払います。
7. その後、同じ地形のタイル 2 枚を使って配置します。

### タイル配置

- 1 枚目は、移動後のアッサムに隣接するマスに置きます。
- 2 枚目は、1 枚目に隣接するマスに置きます。
- 2 枚目はアッサムがいるマスには置けません。
- 1 手番で置く 2 枚は、必ず同じ地形です。
- 手番開始時点で、どの地形も 2 枚未満しか残っていないプレイヤーは配置をスキップして手番終了になります。

### 終了条件と得点

- 全プレイヤーが「同じ地形を 2 枚置ける状態ではない」とき、ゲーム終了です。
- 最終得点は `所持金 + 自分のタイルが盤上にある枚数` です。
- 合計得点が最も高いプレイヤーが勝者になります。

### 現状実装の注意点

- 向き変更は「隣接マスを選ぶ」方式で、追加の制限はまだ入っていません。
- 支払い判定では、着地した地形タイプでつながる連結成分全体を見て、各プレイヤーの枚数差で支払い先と金額を決めます。
- 現状の実装では、配置時に既存タイルの有無はチェックしていないため、既にタイルがあるマスにも上書き配置できます。

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

LAN 内の他端末からアクセスさせる場合も、クライアントは `0.0.0.0:5173` で待ち受けます。Vite 起動時に表示される `Network` URL、または `http://<このPCのLAN IP>:5173` を使ってアクセスしてください。

インターネット越しに公開する場合は、公開URLとゲームサーバーURLを分けて指定できます。`.env` に以下を設定してください。

```bash
VITE_PUBLIC_APP_ORIGIN=https://marrakech.example.com
VITE_GAME_SERVER=https://marrakech-api.example.com
ALLOWED_ORIGINS=https://marrakech.example.com
ALLOWED_API_ORIGINS=https://marrakech.example.com
PUBLIC_GAME_SERVER_ORIGIN=https://marrakech-api.example.com
```

`VITE_PUBLIC_APP_ORIGIN` を設定すると、ホストが `localhost` を開いていてもアプリ内の `Share URL` は公開URLになります。`VITE_GAME_SERVER` は `boardgame.io` の Lobby API と SocketIO の接続先です。

テストを実行します。

```bash
npm test
```

## ローカル公開で遊ぶ手順

1. `npm run dev:server` を起動する
2. 別ターミナルで `npm run dev:client` を起動する
3. ホスト PC で `http://localhost:5173` を開く
4. `Player Name` と `Player Seat` を選び、`Create Room` を押す
5. 画面に出る `Share URL` を友人へ送る
6. 友人は URL を開いて空いている `Player Seat` を選び、`Join Seat` を押す

`localhost` で開いている場合、画面には `Share Path` が表示されます。その場合は `http://<このPCのLAN IP>:5173` の後ろにそのパスを付けて共有してください。

`VITE_PUBLIC_APP_ORIGIN` を設定している場合は、`Share URL` をそのまま共有できます。

## LAN外に公開する手順

1. クライアント公開URLを決める
2. `boardgame.io` サーバーの公開URLを決める
3. `.env` に `VITE_PUBLIC_APP_ORIGIN` と `VITE_GAME_SERVER` を設定する
4. サーバー側で `ALLOWED_ORIGINS` と `ALLOWED_API_ORIGINS` を公開元ドメインに絞る
5. クライアントは `npm run build` で生成した `dist/` を静的ホスティングへ配置する
6. ゲームサーバーは `PORT=<公開先のポート> npm run dev:server` で起動する

公開方法は 2 通りあります。

- トンネルやポートフォワードで自宅PCをそのまま出す
- クライアントを静的ホスティング、ゲームサーバーを Node.js 対応ホスティングへ分離配置する

長く使う前提なら、後者をおすすめします。このリポジトリでは `Vercel Free` にフロント、`Render Free` にゲームサーバーを載せる構成が最も扱いやすいです。

## Vercel Free + Render Free で公開する

### 1. Render にゲームサーバーを作る

Render では `New +` から `Web Service` を選び、このリポジトリを接続します。コマンドは以下です。

```text
Build Command: npm install
Start Command: npm run start:server
```

Node.js は `20.x` を使ってください。このリポジトリの `boardgame.io` サーバー依存は Render の既定 `Node.js 22` では起動時に失敗します。`package.json` の `engines.node` と `.node-version` でも `20.x` に固定しています。

また、Render 本番起動では `tsx` を直接使わず、`npm install` 時に `esbuild` で `dist-server/server.cjs` を生成してから `node dist-server/server.cjs` を起動します。ローカル開発用の `npm run dev:server` は引き続き `tsx server.ts` です。

最初の作成時は、環境変数を以下のように入れてください。

```text
ALLOWED_ORIGINS=*
ALLOWED_API_ORIGINS=*
PUBLIC_GAME_SERVER_ORIGIN=https://<your-render-service>.onrender.com
```

`ALLOWED_ORIGINS` と `ALLOWED_API_ORIGINS` は、最初の Vercel デプロイ URL がまだ未確定なので一度だけ `*` で立ち上げます。Vercel 側の URL が確定したら絞り直します。

### 2. Vercel にフロントを作る

Vercel ではこのリポジトリを `Import Project` します。ビルド設定は [vercel.json](vercel.json) を使うので、基本はそのままで構いません。環境変数は以下です。

```text
VITE_GAME_SERVER=https://<your-render-service>.onrender.com
VITE_PUBLIC_APP_ORIGIN=https://<your-vercel-project>.vercel.app
```

Vercel は `npm run build:client` を実行して `dist/` を配信します。

### 3. Render 側の許可 origin を絞る

Vercel の公開 URL が確定したら、Render の環境変数を以下に更新して再デプロイします。

```text
ALLOWED_ORIGINS=https://<your-vercel-project>.vercel.app
ALLOWED_API_ORIGINS=https://<your-vercel-project>.vercel.app
PUBLIC_GAME_SERVER_ORIGIN=https://<your-render-service>.onrender.com
```

これで、フロントは Vercel から配信され、`boardgame.io` の Lobby API と SocketIO は Render 上のサーバーに接続します。

### 4. 動作確認のポイント

1. Vercel の URL を開いて `Create Room` が成功すること
2. `Share URL` が Vercel の URL になっていること
3. 別ブラウザまたは別端末で `Join Seat` が成功すること

Render Free はスリープ復帰で最初の応答が遅くなることがあります。最初のアクセスだけ数十秒かかる場合があります。

## Windows で Quick Tunnel を一括起動する

`cloudflared` をインストール済みなら、ルートの `start-quick-tunnel.cmd` で以下をまとめて起動できます。

- クライアント用 Quick Tunnel
- ゲームサーバー用 Quick Tunnel
- `npm run dev:server`
- `npm run dev:client`

実行前に `5173` と `8000` が空いていることだけ確認してください。使用中ならスクリプトは停止します。

```bat
start-quick-tunnel.cmd
```

起動後の情報は `.quick-tunnel/session-info.txt` に保存されます。友人に送るのはその中の `Client URL` です。

終了するときは、開いた PowerShell ウィンドウ 4 枚を閉じてください。

## 注意点

- Windows Firewall が Node.js の受信をブロックしていると、他端末から接続できません。初回起動時の許可ダイアログでプライベートネットワークを許可してください。
- クライアントはアクセス元のホスト名を使って `boardgame.io` server (`:8000`) に接続します。`VITE_GAME_SERVER` を指定しない限り、`localhost` 固定にはなりません。
- インターネット公開時は `origins: ["*"]` のままにせず、`ALLOWED_ORIGINS` と `ALLOWED_API_ORIGINS` で公開元を絞った方が安全です。
- 同じ PC / 同じブラウザで再読み込みした場合は、保存済み credentials を使って同じ席に再接続します。
