// server.ts
var import_server = require("boardgame.io/server");

// src/game/types.ts
var PLAYER_LABELS = {
  "0": "A",
  "1": "B",
  "2": "C"
};
var INITIAL_COINS = 30;
var BOARD_RADIUS = 3;
var ALL_DIRECTIONS = [
  "NE",
  "E",
  "SE",
  "SW",
  "W",
  "NW"
];

// src/game/board.ts
function toBoardKey(coord) {
  return `${coord.q},${coord.r}`;
}
function sameHex(left, right) {
  return left.q === right.q && left.r === right.r;
}
function getCell(board, coord) {
  return board[toBoardKey(coord)] ?? null;
}
function setCell(board, coord, cell) {
  board[toBoardKey(coord)] = cell;
}

// src/game/hex.ts
var AXIAL_DELTAS = {
  NE: { q: 1, r: -1 },
  E: { q: 1, r: 0 },
  SE: { q: 0, r: 1 },
  SW: { q: -1, r: 1 },
  W: { q: -1, r: 0 },
  NW: { q: 0, r: -1 }
};
var DIRECTION_ORDER = ["NE", "E", "SE", "SW", "W", "NW"];
function isValidCell(coord) {
  const s = -coord.q - coord.r;
  return Math.max(Math.abs(coord.q), Math.abs(coord.r), Math.abs(s)) <= BOARD_RADIUS;
}
function getAllCells() {
  const cells = [];
  for (let r = -BOARD_RADIUS; r <= BOARD_RADIUS; r++) {
    const minQ = Math.max(-BOARD_RADIUS, -r - BOARD_RADIUS);
    const maxQ = Math.min(BOARD_RADIUS, -r + BOARD_RADIUS);
    for (let q = minQ; q <= maxQ; q++) {
      cells.push({ q, r });
    }
  }
  return cells;
}
function getNeighbors(coord) {
  return DIRECTION_ORDER.map((dir) => stepInDirection(coord, dir)).filter((next) => next !== null);
}
function stepInDirection(coord, dir) {
  const delta = AXIAL_DELTAS[dir];
  const next = { q: coord.q + delta.q, r: coord.r + delta.r };
  return isValidCell(next) ? next : null;
}
function directionFromNeighbor(origin, target) {
  if (!isValidCell(origin) || !isValidCell(target)) return null;
  for (const dir of DIRECTION_ORDER) {
    const next = stepInDirection(origin, dir);
    if (next && sameHex(next, target)) {
      return dir;
    }
  }
  return null;
}
function formatHexCoord(coord) {
  return `(${coord.q},${coord.r})`;
}

// src/game/setup.ts
var INITIAL_TILE_COUNT = 4;
function createEmptyBoard() {
  return Object.fromEntries(getAllCells().map((cell) => [toBoardKey(cell), null]));
}
function createInitialCoins() {
  return {
    "0": INITIAL_COINS,
    "1": INITIAL_COINS,
    "2": INITIAL_COINS
  };
}
function createInitialTiles() {
  const makeTiles = () => ({
    sea: INITIAL_TILE_COUNT,
    forest: INITIAL_TILE_COUNT,
    city: INITIAL_TILE_COUNT
  });
  return {
    "0": makeTiles(),
    "1": makeTiles(),
    "2": makeTiles()
  };
}
function createInitialState() {
  return {
    turnPhase: "chooseDirection",
    board: createEmptyBoard(),
    assam: {
      position: { q: 0, r: 0 },
      direction: "NE"
    },
    coins: createInitialCoins(),
    tiles: createInitialTiles(),
    selectedTerrain: null,
    firstPlacement: null,
    log: []
  };
}

// src/game/movement.ts
function getStepCandidates(coord) {
  return ALL_DIRECTIONS.filter((dir) => stepInDirection(coord, dir) !== null);
}
function moveAssamWithBounce(start, direction, steps, randomUnit) {
  let position = { ...start };
  let currentDirection = direction;
  const redirects = [];
  for (let i = 0; i < steps; i++) {
    let next = stepInDirection(position, currentDirection);
    if (!next) {
      const candidates = getStepCandidates(position);
      const picked = Math.floor(randomUnit() * candidates.length);
      const nextDirection = candidates[picked] ?? candidates[0];
      redirects.push({ from: currentDirection, to: nextDirection, at: { ...position } });
      currentDirection = nextDirection;
      next = stepInDirection(position, currentDirection);
    }
    if (!next) {
      break;
    }
    position = next;
  }
  return { position, direction: currentDirection, redirects };
}

// src/game/payment.ts
function connectedComponentSize(board, start, tile) {
  if (!isValidCell(start)) return 0;
  const visited = /* @__PURE__ */ new Set();
  const queue = [start];
  let size = 0;
  while (queue.length > 0) {
    const current = queue.shift();
    const key = toBoardKey(current);
    if (visited.has(key)) continue;
    visited.add(key);
    const currentTile = getCell(board, current);
    if (currentTile === null || currentTile.owner !== tile.owner || currentTile.terrain !== tile.terrain) {
      continue;
    }
    size += 1;
    for (const next of getNeighbors(current)) {
      const nextKey = toBoardKey(next);
      if (!visited.has(nextKey)) {
        queue.push(next);
      }
    }
  }
  return size;
}
function applyLandingPayment(G, currentPlayer) {
  const landing = G.assam.position;
  const landingTile = getCell(G.board, landing);
  if (landingTile === null || landingTile.owner === currentPlayer) {
    return { paid: false, payee: null, amount: 0 };
  }
  const amount = connectedComponentSize(G.board, landing, landingTile);
  const payable = Math.min(G.coins[currentPlayer], amount);
  G.coins[currentPlayer] -= payable;
  G.coins[landingTile.owner] += payable;
  return {
    paid: payable > 0,
    payee: landingTile.owner,
    amount: payable
  };
}

// src/game/MarrakechGame.ts
var INVALID_MOVE = "INVALID_MOVE";
function formatPlayer(playerID) {
  if (playerID === void 0 || playerID === null) return "unknown";
  return PLAYER_LABELS[playerID] ?? playerID;
}
function canPlaceTiles(G, player) {
  const t = G.tiles[player];
  return t.sea >= 2 || t.forest >= 2 || t.city >= 2;
}
function calculateScores(G) {
  const scores = ["0", "1", "2"].map((id) => {
    let tilesOnBoard = 0;
    for (const cell of getAllCells()) {
      const tile = getCell(G.board, cell);
      if (tile && tile.owner === id) {
        tilesOnBoard += 1;
      }
    }
    return {
      player: id,
      coins: G.coins[id],
      tilesOnBoard,
      total: G.coins[id] + tilesOnBoard
    };
  });
  return scores.sort((a, b) => b.total - a.total);
}
var MarrakechGame = {
  name: "marrakech",
  setup: () => createInitialState(),
  endIf: ({ G }) => {
    const allExhausted = ["0", "1", "2"].every(
      (id) => !canPlaceTiles(G, id)
    );
    if (allExhausted) {
      const scores = calculateScores(G);
      return { winner: scores[0].player, scores };
    }
  },
  turn: {
    order: {
      first: () => 0,
      next: ({ ctx }) => (Number(ctx.playOrderPos) + 1) % ctx.numPlayers
    },
    activePlayers: { currentPlayer: "chooseDirection" },
    stages: {
      chooseDirection: { moves: { chooseDirection }, next: "moveAssam" },
      moveAssam: { moves: { moveAssam }, next: "placeFirstTile" },
      placeFirstTile: { moves: { placeFirstTile }, next: "placeSecondTile" },
      placeSecondTile: { moves: { placeSecondTile } }
    },
    onBegin: ({ G }) => {
      G.turnPhase = "chooseDirection";
      G.selectedTerrain = null;
      G.firstPlacement = null;
    }
  }
};
function chooseDirection({
  G,
  ctx,
  events
}, target) {
  if (G.turnPhase !== "chooseDirection") return INVALID_MOVE;
  const newDirection = directionFromNeighbor(G.assam.position, target);
  if (!newDirection) return INVALID_MOVE;
  G.assam.direction = newDirection;
  const player = formatPlayer(ctx.currentPlayer);
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer,
    action: "chooseDirection",
    detail: `${player} \u304C\u5411\u304D\u3092 ${newDirection} \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
  });
  G.turnPhase = "moveAssam";
  events.endStage();
}
function moveAssam({
  G,
  ctx,
  random,
  events
}) {
  if (G.turnPhase !== "moveAssam") return INVALID_MOVE;
  const randomUnit = () => random.Number();
  const steps = Math.floor(randomUnit() * 3) + 1;
  const result = moveAssamWithBounce(
    G.assam.position,
    G.assam.direction,
    steps,
    randomUnit
  );
  G.assam.position = result.position;
  G.assam.direction = result.direction;
  const payment = applyLandingPayment(G, ctx.currentPlayer);
  const player = formatPlayer(ctx.currentPlayer);
  const redirectDetail = result.redirects.length === 0 ? "" : ` / \u76E4\u5916\u56DE\u907F: ${result.redirects.map((redirect) => `${formatHexCoord(redirect.at)} ${redirect.from}\u2192${redirect.to}`).join(", ")}`;
  const paymentDetail = payment.paid && payment.payee !== null ? ` / \u652F\u6255\u3044: ${player} \u2192 ${formatPlayer(payment.payee)} \u306B ${payment.amount}` : "";
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer,
    action: "moveAssam",
    detail: `${player} \u304C ${steps} \u30DE\u30B9\u79FB\u52D5\u3057 ${formatHexCoord(result.position)} \u306B\u5230\u9054\u3002\u5411\u304D: ${result.direction}${redirectDetail}${paymentDetail}`
  });
  const currentPlayer = ctx.currentPlayer;
  if (!canPlaceTiles(G, currentPlayer)) {
    G.log.unshift({
      turn: ctx.turn,
      player: currentPlayer,
      action: "skipPlacement",
      detail: `${player} \u306F\u914D\u7F6E\u53EF\u80FD\u306A\u30BF\u30A4\u30EB\u304C\u306A\u3044\u305F\u3081\u914D\u7F6E\u3092\u30B9\u30AD\u30C3\u30D7\u3057\u307E\u3057\u305F\u3002`
    });
    events.endTurn();
    return;
  }
  G.turnPhase = "placeFirstTile";
  events.endStage();
}
function placeFirstTile({
  G,
  ctx,
  events
}, target, terrain) {
  if (G.turnPhase !== "placeFirstTile") return INVALID_MOVE;
  const currentPlayer = ctx.currentPlayer;
  const isAdjacentToAssam = getNeighbors(G.assam.position).some(
    (neighbor) => sameHex(neighbor, target)
  );
  if (!isAdjacentToAssam) return INVALID_MOVE;
  if (G.tiles[currentPlayer][terrain] < 2) return INVALID_MOVE;
  const player = formatPlayer(ctx.currentPlayer);
  setCell(G.board, target, { terrain, owner: currentPlayer });
  G.tiles[currentPlayer][terrain] -= 1;
  G.selectedTerrain = terrain;
  G.firstPlacement = { ...target };
  G.log.unshift({
    turn: ctx.turn,
    player: currentPlayer,
    action: "placeFirstTile",
    detail: `${player} \u304C ${terrain} \u3092 ${formatHexCoord(target)} \u306B\u914D\u7F6E\u3057\u307E\u3057\u305F\u3002`
  });
  G.turnPhase = "placeSecondTile";
  events.endStage();
}
function placeSecondTile({
  G,
  ctx,
  events
}, target) {
  if (G.turnPhase !== "placeSecondTile") return INVALID_MOVE;
  const currentPlayer = ctx.currentPlayer;
  if (G.selectedTerrain === null || G.firstPlacement === null) return INVALID_MOVE;
  if (sameHex(target, G.assam.position)) {
    return INVALID_MOVE;
  }
  const isAdjacentToFirst = getNeighbors(G.firstPlacement).some(
    (neighbor) => sameHex(neighbor, target)
  );
  if (!isAdjacentToFirst) return INVALID_MOVE;
  if (G.tiles[currentPlayer][G.selectedTerrain] < 1) return INVALID_MOVE;
  const player = formatPlayer(ctx.currentPlayer);
  const terrain = G.selectedTerrain;
  setCell(G.board, target, { terrain, owner: currentPlayer });
  G.tiles[currentPlayer][terrain] -= 1;
  G.selectedTerrain = null;
  G.firstPlacement = null;
  G.log.unshift({
    turn: ctx.turn,
    player: currentPlayer,
    action: "placeSecondTile",
    detail: `${player} \u304C ${terrain} \u3092 ${formatHexCoord(target)} \u306B\u914D\u7F6E\u3057\u3066\u624B\u756A\u3092\u7D42\u4E86\u3057\u307E\u3057\u305F\u3002`
  });
  events.endTurn();
}

// server.ts
function parseOriginList(value) {
  const origins2 = value?.split(",").map((origin) => origin.trim()).filter(Boolean);
  return origins2 && origins2.length > 0 ? origins2 : void 0;
}
function trimTrailingSlash(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
var origins = parseOriginList(process.env.ALLOWED_ORIGINS) ?? ["*"];
var apiOrigins = parseOriginList(process.env.ALLOWED_API_ORIGINS) ?? origins;
var publicGameServerOrigin = process.env.PUBLIC_GAME_SERVER_ORIGIN?.trim();
var server = (0, import_server.Server)({
  games: [MarrakechGame],
  origins,
  apiOrigins
});
var port = Number(process.env.PORT ?? 8e3);
void server.run(port).then(() => {
  console.log(`boardgame.io server listening on http://localhost:${port}`);
  if (publicGameServerOrigin) {
    console.log(`Public game server origin: ${trimTrailingSlash(publicGameServerOrigin)}`);
  }
  console.log(`Allowed client origins: ${origins.join(", ")}`);
  console.log("Lobby API and socket transport are ready for LAN or internet clients.");
});
