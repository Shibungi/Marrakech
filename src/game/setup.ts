// ---------------------------------------------------------------------------
// Marrakech – 初期状態生成
// ---------------------------------------------------------------------------

import {
  type MarrakechState,
  type PlayerId,
  type TerrainType,
  INITIAL_COINS,
} from "./types";
import { getAllCells } from "./hex";
import { toBoardKey } from "./board";

/** 各プレイヤーの初期タイル枚数（地形タイプ別） */
const INITIAL_TILE_COUNT = 4;

/** 空の盤面を生成する */
function createEmptyBoard(): MarrakechState["board"] {
  return Object.fromEntries(getAllCells().map((cell) => [toBoardKey(cell), null]));
}

/** 初期所持金を生成 */
function createInitialCoins(): Record<PlayerId, number> {
  return {
    "0": INITIAL_COINS,
    "1": INITIAL_COINS,
    "2": INITIAL_COINS,
  };
}

/** 初期タイル在庫を生成 */
function createInitialTiles(): Record<PlayerId, Record<TerrainType, number>> {
  const makeTiles = (): Record<TerrainType, number> => ({
    sea: INITIAL_TILE_COUNT,
    mountain: INITIAL_TILE_COUNT,
    city: INITIAL_TILE_COUNT,
  });
  return {
    "0": makeTiles(),
    "1": makeTiles(),
    "2": makeTiles(),
  };
}

/** boardgame.io の setup() に渡す初期状態を生成 */
export function createInitialState(): MarrakechState {
  return {
    turnPhase: "chooseDirection",
    board: createEmptyBoard(),
    assam: {
      position: { q: 0, r: 0 },
      direction: "NE",
    },
    coins: createInitialCoins(),
    tiles: createInitialTiles(),
    selectedTerrain: null,
    firstPlacement: null,
    log: [],
  };
}
