import type { World } from "../domain/world";

export interface Sprite {
  cv: HTMLCanvasElement;
  w: number;
  h: number;
}

export interface WorldHandle {
  /** Push a new world state. `fx` plays arrival / growth effects. */
  setWorld(world: World, fx: boolean): void;
  panBy(dx: number): void;
  /** true = night, false = day, null = real clock */
  setNight(v: boolean | null): void;
  /** Center the camera on a world x (0–480). */
  focus(x: number): void;
  destroy(): void;
}

export function createWorld(canvas: HTMLCanvasElement, bubble: HTMLElement | null): WorldHandle;
export function speciesIcon(id: string): Sprite;
