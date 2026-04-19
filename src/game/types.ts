// ---------------------------------------------------------------------------
// Marrakech (Mars Theme) – Domain Types
// Phase 2: roadmap.md §2 の仕様に基づく型定義
// ---------------------------------------------------------------------------

/** プレイヤー ID（内部表現） */
export type PlayerId = "0" | "1" | "2";

/** プレイヤー数 */
export const NUM_PLAYERS = 3;

/** 表示用ラベル */
export const PLAYER_LABELS: Record<PlayerId, string> = {
  "0": "A",
  "1": "B",
  "2": "C",
};

/** 初期所持金 */
export const INITIAL_COINS = 30;

// ---------------------------------------------------------------------------
// 盤面
// ---------------------------------------------------------------------------

/** 六角形マップの行ごとのマス数（7 段: 4-5-6-7-6-5-4） */
export const ROW_SIZES = [4, 5, 6, 7, 6, 5, 4] as const;

/** 行数 */
export const NUM_ROWS = ROW_SIZES.length; // 7

/** 六角座標 (row, col) */
export interface HexCoord {
  row: number;
  col: number;
}

// ---------------------------------------------------------------------------
// 地形
// ---------------------------------------------------------------------------

/** 地形タイプ */
export type TerrainType = "sea" | "mountain" | "city";

/** マス上のタイル情報（地形あり） */
export interface Tile {
  terrain: TerrainType;
  owner: PlayerId;
}

/** 盤面の 1 マス – タイルが無い場合は null */
export type CellState = Tile | null;

// ---------------------------------------------------------------------------
// アッサム
// ---------------------------------------------------------------------------

/**
 * 6 方向。
 * offset-hex (odd-r) 座標系に合わせた方向定義。
 * 時計回りに: NE, E, SE, SW, W, NW
 */
export type Direction = "NE" | "E" | "SE" | "SW" | "W" | "NW";

export const ALL_DIRECTIONS: readonly Direction[] = [
  "NE",
  "E",
  "SE",
  "SW",
  "W",
  "NW",
] as const;

/** アッサムの状態 */
export interface AssamState {
  position: HexCoord;
  direction: Direction;
}

// ---------------------------------------------------------------------------
// ゲームフェーズ
// ---------------------------------------------------------------------------

/** boardgame.io 上のフェーズ名 */
export type GamePhase =
  | "chooseDirection"
  | "moveAssam"
  | "placeFirstTile"
  | "placeSecondTile";

// ---------------------------------------------------------------------------
// ログ
// ---------------------------------------------------------------------------

export interface GameLogEntry {
  turn: number;
  player: PlayerId;
  action: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// ゲーム全体の状態 (G)
// ---------------------------------------------------------------------------

export interface MarrakechState {
  /** 手番内の進行フェーズ */
  turnPhase: GamePhase;

  /** 盤面: board[row][col] */
  board: CellState[][];

  /** アッサム */
  assam: AssamState;

  /** 各プレイヤーの所持金 */
  coins: Record<PlayerId, number>;

  /** 各プレイヤーの残りタイル数（地形タイプ別） */
  tiles: Record<PlayerId, Record<TerrainType, number>>;

  /** 1 手番中に配置する地形タイプ（配置フェーズで使用） */
  selectedTerrain: TerrainType | null;

  /** 1 マス目の配置座標（placeSecondTile で参照） */
  firstPlacement: HexCoord | null;

  /** イベントログ */
  log: GameLogEntry[];
}

// ---------------------------------------------------------------------------
// スコア
// ---------------------------------------------------------------------------

export interface PlayerScore {
  player: PlayerId;
  coins: number;
  tilesOnBoard: number;
  total: number;
}
