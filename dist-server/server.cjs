// server.ts
var import_server = require("boardgame.io/server");

// src/game/types.ts
var PLAYER_LABELS = {
  "0": "A",
  "1": "B",
  "2": "C"
};
var INITIAL_COINS = 30;
var ROW_SIZES = [4, 5, 6, 7, 6, 5, 4];
var NUM_ROWS = ROW_SIZES.length;
var ALL_DIRECTIONS = [
  "NE",
  "E",
  "SE",
  "SW",
  "W",
  "NW"
];

// src/game/setup.ts
var INITIAL_TILE_COUNT = 4;
function createEmptyBoard() {
  return ROW_SIZES.map((size) => Array.from({ length: size }, () => null));
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
    mountain: INITIAL_TILE_COUNT,
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
      position: { row: 3, col: 3 },
      direction: "NE"
    },
    coins: createInitialCoins(),
    tiles: createInitialTiles(),
    selectedTerrain: null,
    firstPlacement: null,
    log: []
  };
}

// src/game/hex.ts
function isValidCell(coord) {
  const { row, col } = coord;
  if (row < 0 || row >= NUM_ROWS) return false;
  if (col < 0 || col >= ROW_SIZES[row]) return false;
  return true;
}
function rowOffset(row) {
  return Math.abs(row - 3);
}
function toDoubled(hex) {
  return { x: 2 * hex.col + rowOffset(hex.row), y: hex.row };
}
function fromDoubled(dc) {
  const row = dc.y;
  if (row < 0 || row >= NUM_ROWS) return null;
  const offset = rowOffset(row);
  const colRaw = dc.x - offset;
  if (colRaw % 2 !== 0) return null;
  const col = colRaw / 2;
  const hex = { row, col };
  return isValidCell(hex) ? hex : null;
}
var DOUBLED_DELTAS = {
  NE: { dx: 1, dy: -1 },
  E: { dx: 2, dy: 0 },
  SE: { dx: 1, dy: 1 },
  SW: { dx: -1, dy: 1 },
  W: { dx: -2, dy: 0 },
  NW: { dx: -1, dy: -1 }
};
var DIRECTION_ORDER = ["NE", "E", "SE", "SW", "W", "NW"];
function getNeighbors(coord) {
  const dc = toDoubled(coord);
  const neighbors = [];
  for (const { dx, dy } of Object.values(DOUBLED_DELTAS)) {
    const next = fromDoubled({ x: dc.x + dx, y: dc.y + dy });
    if (next) {
      neighbors.push(next);
    }
  }
  return neighbors;
}
function stepInDirection(coord, dir) {
  const dc = toDoubled(coord);
  const delta = DOUBLED_DELTAS[dir];
  return fromDoubled({ x: dc.x + delta.dx, y: dc.y + delta.dy });
}
function directionFromNeighbor(origin, target) {
  if (!isValidCell(origin) || !isValidCell(target)) return null;
  for (const dir of DIRECTION_ORDER) {
    const next = stepInDirection(origin, dir);
    if (next && next.row === target.row && next.col === target.col) {
      return dir;
    }
  }
  return null;
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
    const key = `${current.row},${current.col}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const currentTile = board[current.row]?.[current.col] ?? null;
    if (currentTile === null || currentTile.owner !== tile.owner || currentTile.terrain !== tile.terrain) {
      continue;
    }
    size += 1;
    for (const next of getNeighbors(current)) {
      const nextKey = `${next.row},${next.col}`;
      if (!visited.has(nextKey)) {
        queue.push(next);
      }
    }
  }
  return size;
}
function applyLandingPayment(G, currentPlayer) {
  const landing = G.assam.position;
  const landingTile = G.board[landing.row]?.[landing.col] ?? null;
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
  return t.sea >= 2 || t.mountain >= 2 || t.city >= 2;
}
function calculateScores(G) {
  const scores = ["0", "1", "2"].map((id) => {
    let tilesOnBoard = 0;
    for (const row of G.board) {
      for (const cell of row) {
        if (cell && cell.owner === id) tilesOnBoard++;
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
  const redirectDetail = result.redirects.length === 0 ? "" : ` / \u76E4\u5916\u56DE\u907F: ${result.redirects.map((redirect) => `(${redirect.at.row},${redirect.at.col}) ${redirect.from}\u2192${redirect.to}`).join(", ")}`;
  const paymentDetail = payment.paid && payment.payee !== null ? ` / \u652F\u6255\u3044: ${player} \u2192 ${formatPlayer(payment.payee)} \u306B ${payment.amount}` : "";
  G.log.unshift({
    turn: ctx.turn,
    player: ctx.currentPlayer,
    action: "moveAssam",
    detail: `${player} \u304C ${steps} \u30DE\u30B9\u79FB\u52D5\u3057 (${result.position.row},${result.position.col}) \u306B\u5230\u9054\u3002\u5411\u304D: ${result.direction}${redirectDetail}${paymentDetail}`
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
    (neighbor) => neighbor.row === target.row && neighbor.col === target.col
  );
  if (!isAdjacentToAssam) return INVALID_MOVE;
  if (G.tiles[currentPlayer][terrain] < 2) return INVALID_MOVE;
  const player = formatPlayer(ctx.currentPlayer);
  G.board[target.row][target.col] = { terrain, owner: currentPlayer };
  G.tiles[currentPlayer][terrain] -= 1;
  G.selectedTerrain = terrain;
  G.firstPlacement = { ...target };
  G.log.unshift({
    turn: ctx.turn,
    player: currentPlayer,
    action: "placeFirstTile",
    detail: `${player} \u304C ${terrain} \u3092 (${target.row},${target.col}) \u306B\u914D\u7F6E\u3057\u307E\u3057\u305F\u3002`
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
  if (target.row === G.assam.position.row && target.col === G.assam.position.col) {
    return INVALID_MOVE;
  }
  const isAdjacentToFirst = getNeighbors(G.firstPlacement).some(
    (neighbor) => neighbor.row === target.row && neighbor.col === target.col
  );
  if (!isAdjacentToFirst) return INVALID_MOVE;
  if (G.tiles[currentPlayer][G.selectedTerrain] < 1) return INVALID_MOVE;
  const player = formatPlayer(ctx.currentPlayer);
  const terrain = G.selectedTerrain;
  G.board[target.row][target.col] = { terrain, owner: currentPlayer };
  G.tiles[currentPlayer][terrain] -= 1;
  G.selectedTerrain = null;
  G.firstPlacement = null;
  G.log.unshift({
    turn: ctx.turn,
    player: currentPlayer,
    action: "placeSecondTile",
    detail: `${player} \u304C ${terrain} \u3092 (${target.row},${target.col}) \u306B\u914D\u7F6E\u3057\u3066\u624B\u756A\u3092\u7D42\u4E86\u3057\u307E\u3057\u305F\u3002`
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
