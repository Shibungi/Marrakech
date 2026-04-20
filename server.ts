import { createRequire } from "node:module";

import { MarrakechGame } from "./src/game/MarrakechGame";

const require = createRequire(import.meta.url);
const { Server } = require("boardgame.io/server") as {
  Server: (options: {
    games: unknown[];
    origins?: string[];
    apiOrigins?: string[];
  }) => { run: (port: number) => Promise<unknown> };
};

function parseOriginList(value: string | undefined): string[] | undefined {
  const origins = value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins && origins.length > 0 ? origins : undefined;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const origins = parseOriginList(process.env.ALLOWED_ORIGINS) ?? ["*"];
const apiOrigins = parseOriginList(process.env.ALLOWED_API_ORIGINS) ?? origins;
const publicGameServerOrigin = process.env.PUBLIC_GAME_SERVER_ORIGIN?.trim();

const server = Server({
  games: [MarrakechGame],
  origins,
  apiOrigins,
});

const port = Number(process.env.PORT ?? 8000);

void server.run(port).then(() => {
  console.log(`boardgame.io server listening on http://localhost:${port}`);
  if (publicGameServerOrigin) {
    console.log(`Public game server origin: ${trimTrailingSlash(publicGameServerOrigin)}`);
  }
  console.log(`Allowed client origins: ${origins.join(", ")}`);
  console.log("Lobby API and socket transport are ready for LAN or internet clients.");
});
