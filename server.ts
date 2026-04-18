import { createRequire } from "node:module";

import { MarrakechGame } from "./src/game/MarrakechGame";

const require = createRequire(import.meta.url);
const { Server } = require("boardgame.io/server") as {
  Server: (options: { games: unknown[] }) => { run: (port: number) => void };
};

const server = Server({
  games: [MarrakechGame],
});

const port = Number(process.env.PORT ?? 8000);

server.run(port);
console.log(`boardgame.io server listening on http://localhost:${port}`);
