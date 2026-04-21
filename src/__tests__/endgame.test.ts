import { describe, expect, it } from "vitest";
import { Client } from "boardgame.io/client";

import { MarrakechGame, canPlaceTiles, calculateScores } from "../game/MarrakechGame";
import { getNeighbors } from "../game/hex";
import { createInitialState } from "../game/setup";
import type { MarrakechState, PlayerId } from "../game/types";
import { cloneBoard, sameHex, setCell } from "../game/board";

function withBoard(state: MarrakechState): MarrakechState {
	return {
		...state,
		board: cloneBoard(state.board),
		coins: { ...state.coins },
		tiles: {
			"0": { ...state.tiles["0"] },
			"1": { ...state.tiles["1"] },
			"2": { ...state.tiles["2"] },
		},
	};
}

function createTestClient(game = MarrakechGame) {
	return Client<MarrakechState>({ game, numPlayers: 3 });
}

/** 1 ターン分を実行するヘルパー */
function playOneTurn(client: ReturnType<typeof createTestClient>) {
	const state = client.getState()!;
	const origin = state.G.assam.position;
	const neighbors = getNeighbors(origin);
	client.moves.chooseDirection(neighbors[0]);
	client.moves.moveAssam();

	const afterMove = client.getState()!;
	if (afterMove.G.turnPhase !== "placeFirstTile") {
		// タイル不足でスキップされた
		return;
	}

	const assam = afterMove.G.assam.position;
	const firstTarget = getNeighbors(assam)[0];
	const currentPlayer = afterMove.ctx.currentPlayer as PlayerId;
	const availableTerrain = (["sea", "forest", "city"] as const).find(
		(t) => afterMove.G.tiles[currentPlayer][t] >= 2,
	);
	if (!availableTerrain) return;

	client.moves.placeFirstTile(firstTarget, availableTerrain);
	const secondTarget = getNeighbors(firstTarget).find(
		(cell) => !sameHex(cell, assam),
	)!;
	client.moves.placeSecondTile(secondTarget);
}

describe("canPlaceTiles", () => {
	it("タイルが十分あれば true", () => {
		const G = createInitialState();
		expect(canPlaceTiles(G, "0")).toBe(true);
	});

	it("全タイプが 1 枚以下なら false", () => {
		const G = withBoard(createInitialState());
		G.tiles["0"] = { sea: 1, forest: 0, city: 1 };
		expect(canPlaceTiles(G, "0")).toBe(false);
	});

	it("1 タイプでも 2 枚以上あれば true", () => {
		const G = withBoard(createInitialState());
		G.tiles["0"] = { sea: 0, forest: 2, city: 0 };
		expect(canPlaceTiles(G, "0")).toBe(true);
	});
});

describe("calculateScores", () => {
	it("所持金 + 盤面タイル数で降順ソートされる", () => {
		const G = withBoard(createInitialState());
		G.coins = { "0": 20, "1": 30, "2": 25 };
		setCell(G.board, { q: 0, r: 0 }, { terrain: "sea", owner: "0" });
		setCell(G.board, { q: 1, r: 0 }, { terrain: "sea", owner: "0" });
		setCell(G.board, { q: 2, r: 0 }, { terrain: "city", owner: "2" });

		const scores = calculateScores(G);
		expect(scores[0]).toEqual({ player: "1", coins: 30, tilesOnBoard: 0, total: 30 });
		expect(scores[1]).toEqual({ player: "2", coins: 25, tilesOnBoard: 1, total: 26 });
		expect(scores[2]).toEqual({ player: "0", coins: 20, tilesOnBoard: 2, total: 22 });
	});
});

describe("endIf – ゲーム終了判定", () => {
	it("タイルが残っている間はゲームが終了しない", () => {
		const client = createTestClient();
		client.start();
		playOneTurn(client);

		const state = client.getState()!;
		expect(state.ctx.gameover).toBeUndefined();
	});

	it("全プレイヤーのタイルが尽きるとゲーム終了する", () => {
		const gameExhausted = {
			...MarrakechGame,
			setup: () => {
				const G = withBoard(createInitialState());
				// 全プレイヤーのタイルを枯渇させる
				for (const id of ["0", "1", "2"] as PlayerId[]) {
					G.tiles[id] = { sea: 0, forest: 0, city: 0 };
				}
				return G;
			},
		};

		const client = createTestClient(gameExhausted);
		client.start();

		const state = client.getState()!;
		expect(state.ctx.gameover).toBeDefined();
		expect(state.ctx.gameover.winner).toBeDefined();
		expect(state.ctx.gameover.scores).toHaveLength(3);
	});

	it("タイル不足プレイヤーは配置をスキップし手番が進む", () => {
		const gameOneExhausted = {
			...MarrakechGame,
			setup: () => {
				const G = withBoard(createInitialState());
				G.tiles["0"] = { sea: 0, forest: 0, city: 0 };
				return G;
			},
		};

		const client = createTestClient(gameOneExhausted);
		client.start();

		expect(client.getState()!.ctx.currentPlayer).toBe("0");

		const origin = client.getState()!.G.assam.position;
		client.moves.chooseDirection(getNeighbors(origin)[0]);
		client.moves.moveAssam();

		// プレイヤー 0 はタイル不足のため配置スキップ → 手番がプレイヤー 1 に移る
		const state = client.getState()!;
		expect(state.ctx.currentPlayer).toBe("1");
		expect(state.G.log.some((e) => e.action === "skipPlacement")).toBe(true);
	});
});
