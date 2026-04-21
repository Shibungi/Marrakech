import { describe, it, expect } from "vitest";
import {
  isValidCell,
  getAllCells,
  getNeighbors,
  stepInDirection,
  oppositeDirection,
  rotateClockwise,
  rotateCounterClockwise,
  directionFromNeighbor,
} from "../game/hex";
import type { HexCoord, Direction } from "../game/types";
import { sameHex, toBoardKey } from "../game/board";

// ---------------------------------------------------------------------------
// isValidCell
// ---------------------------------------------------------------------------
describe("isValidCell", () => {
  it("中央マス (0,0) は有効", () => {
    expect(isValidCell({ q: 0, r: 0 })).toBe(true);
  });

  it("6 つの角マスは有効", () => {
    const corners: HexCoord[] = [
      { q: 0, r: -3 },
      { q: 3, r: -3 },
      { q: 3, r: 0 },
      { q: 0, r: 3 },
      { q: -3, r: 3 },
      { q: -3, r: 0 },
    ];
    for (const corner of corners) {
      expect(isValidCell(corner)).toBe(true);
    }
  });

  it("半径 3 を超える座標は無効", () => {
    expect(isValidCell({ q: 4, r: 0 })).toBe(false);
    expect(isValidCell({ q: 0, r: -4 })).toBe(false);
    expect(isValidCell({ q: 2, r: 2 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getAllCells
// ---------------------------------------------------------------------------
describe("getAllCells", () => {
  it("合計 37 マスを返す (4+5+6+7+6+5+4)", () => {
    const cells = getAllCells();
    expect(cells).toHaveLength(37);
  });

  it("すべてのセルが有効", () => {
    const cells = getAllCells();
    for (const cell of cells) {
      expect(isValidCell(cell)).toBe(true);
    }
  });

  it("重複がない", () => {
    const cells = getAllCells();
    const keys = new Set(cells.map((c) => toBoardKey(c)));
    expect(keys.size).toBe(cells.length);
  });
});

// ---------------------------------------------------------------------------
// getNeighbors
// ---------------------------------------------------------------------------
describe("getNeighbors", () => {
  it("中央マス (0,0) は 6 つの隣接マスを持つ", () => {
    const neighbors = getNeighbors({ q: 0, r: 0 });
    expect(neighbors).toHaveLength(6);
    for (const n of neighbors) {
      expect(isValidCell(n)).toBe(true);
    }
  });

  it("角マス (0,-3) の隣接は 3 つ", () => {
    const neighbors = getNeighbors({ q: 0, r: -3 });
    expect(neighbors).toHaveLength(3);
  });

  it("角マス (3,-3) の隣接は 3 つ", () => {
    const neighbors = getNeighbors({ q: 3, r: -3 });
    expect(neighbors).toHaveLength(3);
  });

  it("辺マス (1,-3) の隣接数を確認", () => {
    const neighbors = getNeighbors({ q: 1, r: -3 });
    expect(neighbors).toHaveLength(4);
    for (const n of neighbors) {
      expect(isValidCell(n)).toBe(true);
    }
  });

  it("隣接関係は対称: A が B の隣接なら B も A の隣接", () => {
    const center: HexCoord = { q: 0, r: 0 };
    const neighbors = getNeighbors(center);
    for (const n of neighbors) {
      const reverseNeighbors = getNeighbors(n);
      const found = reverseNeighbors.some((rn) => sameHex(rn, center));
      expect(found).toBe(true);
    }
  });

  it("上下対称なマスで隣接数が一致する", () => {
    expect(getNeighbors({ q: 0, r: -3 })).toHaveLength(3);
    expect(getNeighbors({ q: 0, r: 3 })).toHaveLength(3);
    expect(getNeighbors({ q: 1, r: -1 })).toHaveLength(6);
    expect(getNeighbors({ q: -1, r: 1 })).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// stepInDirection
// ---------------------------------------------------------------------------
describe("stepInDirection", () => {
  it("中央 (0,0) から NE に進むと有効なマス", () => {
    const result = stepInDirection({ q: 0, r: 0 }, "NE");
    expect(result).not.toBeNull();
    expect(isValidCell(result!)).toBe(true);
  });

  it("中央 (0,0) から全方向に進めるマスがある", () => {
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      const result = stepInDirection({ q: 0, r: 0 }, d);
      expect(result).not.toBeNull();
      expect(isValidCell(result!)).toBe(true);
    }
  });

  it("stepInDirection の結果は getNeighbors に含まれる", () => {
    const coord: HexCoord = { q: 0, r: 0 };
    const neighbors = getNeighbors(coord);
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      const result = stepInDirection(coord, d);
      if (result) {
        const found = neighbors.some((n) => sameHex(n, result));
        expect(found).toBe(true);
      }
    }
  });

  it("盤端から外に出る方向は null を返す", () => {
    const result = stepInDirection({ q: 0, r: -3 }, "NW");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// oppositeDirection
// ---------------------------------------------------------------------------
describe("oppositeDirection", () => {
  it("各方向の反対が正しい", () => {
    expect(oppositeDirection("NE")).toBe("SW");
    expect(oppositeDirection("E")).toBe("W");
    expect(oppositeDirection("SE")).toBe("NW");
    expect(oppositeDirection("SW")).toBe("NE");
    expect(oppositeDirection("W")).toBe("E");
    expect(oppositeDirection("NW")).toBe("SE");
  });

  it("二重反転で元に戻る", () => {
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      expect(oppositeDirection(oppositeDirection(d))).toBe(d);
    }
  });
});

// ---------------------------------------------------------------------------
// rotateClockwise / rotateCounterClockwise
// ---------------------------------------------------------------------------
describe("rotation", () => {
  it("時計回り 6 回で元に戻る", () => {
    let dir: Direction = "NE";
    for (let i = 0; i < 6; i++) {
      dir = rotateClockwise(dir);
    }
    expect(dir).toBe("NE");
  });

  it("反時計回り 6 回で元に戻る", () => {
    let dir: Direction = "NE";
    for (let i = 0; i < 6; i++) {
      dir = rotateCounterClockwise(dir);
    }
    expect(dir).toBe("NE");
  });

  it("時計回り + 反時計回りで元に戻る", () => {
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const d of dirs) {
      expect(rotateCounterClockwise(rotateClockwise(d))).toBe(d);
      expect(rotateClockwise(rotateCounterClockwise(d))).toBe(d);
    }
  });

  it("NE → 時計回り = E", () => {
    expect(rotateClockwise("NE")).toBe("E");
  });

  it("NE → 反時計回り = NW", () => {
    expect(rotateCounterClockwise("NE")).toBe("NW");
  });
});

// ---------------------------------------------------------------------------
// directionFromNeighbor
// ---------------------------------------------------------------------------
describe("directionFromNeighbor", () => {
  it("中央から隣接マスを指定すると方向を返す", () => {
    const origin: HexCoord = { q: 0, r: 0 };
    const dirs: Direction[] = ["NE", "E", "SE", "SW", "W", "NW"];
    for (const dir of dirs) {
      const target = stepInDirection(origin, dir);
      expect(target).not.toBeNull();
      expect(directionFromNeighbor(origin, target!)).toBe(dir);
    }
  });

  it("隣接していないマスの場合は null", () => {
    expect(directionFromNeighbor({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// 盤面全体の隣接整合性
// ---------------------------------------------------------------------------
describe("盤面全体の隣接整合性", () => {
  it("すべてのマスで隣接マスが有効かつ対称", () => {
    const allCells = getAllCells();
    for (const cell of allCells) {
      const neighbors = getNeighbors(cell);
      for (const n of neighbors) {
        expect(isValidCell(n)).toBe(true);
        const reverse = getNeighbors(n);
        const found = reverse.some((r) => sameHex(r, cell));
        expect(found).toBe(true);
      }
    }
  });
});
