import { ALL_DIRECTIONS, type Direction, type HexCoord } from "./types";
import { stepInDirection } from "./hex";

export interface AssamMoveResult {
  position: HexCoord;
  direction: Direction;
  redirects: Array<{ from: Direction; to: Direction; at: HexCoord }>;
}

export function getStepCandidates(coord: HexCoord): Direction[] {
  return ALL_DIRECTIONS.filter((dir) => stepInDirection(coord, dir) !== null);
}

export function moveAssamWithBounce(
  start: HexCoord,
  direction: Direction,
  steps: number,
  randomUnit: () => number,
): AssamMoveResult {
  let position = { ...start };
  let currentDirection = direction;
  const redirects: AssamMoveResult["redirects"] = [];

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
