import { useEffect, useMemo, useRef, useState } from "react";
import { Pips } from "../components/ui";
import { useStore } from "../data/StoreProvider";
import { CABIN_STAGES, CABIN_STEPS, SPECIES, computeWorld, type World } from "../domain/world";
import type { DayKey } from "../lib/date";
import { createWorld, speciesIcon, type WorldHandle } from "../world/engine";

function SpriteIcon({ id, locked, scale = 3 }: { id: string; locked?: boolean; scale?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const spr = speciesIcon(id);
    const c = ref.current;
    if (!c) return;
    c.width = spr.w;
    c.height = spr.h;
    const x = c.getContext("2d")!;
    x.imageSmoothingEnabled = false;
    x.drawImage(spr.cv, 0, 0);
    if (locked) {
      x.globalCompositeOperation = "source-atop";
      x.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--line").trim() || "#333";
      x.fillRect(0, 0, spr.w, spr.h);
    }
    const k = Math.min(scale, 40 / spr.h, 64 / spr.w);
    c.style.width = `${spr.w * k}px`;
    c.style.height = `${spr.h * k}px`;
  }, [id, locked, scale]);
  return <canvas ref={ref} className="pixel" aria-hidden="true" />;
}

export function ForestView({ today }: { today: DayKey }) {
  const { data } = useStore();
  const world: World = useMemo(() => computeWorld(data.entries, data.settings, today), [data.entries, data.settings, today]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const handle = useRef<WorldHandle | null>(null);
  const [night, setNight] = useState<boolean | null>(null);
  const firstPush = useRef(true);

  useEffect(() => {
    if (!canvas.current) return;
    handle.current = createWorld(canvas.current, bubble.current);
    return () => handle.current?.destroy();
  }, []);

  useEffect(() => {
    handle.current?.setWorld(world, !firstPush.current);
    firstPush.current = false;
  }, [world]);

  useEffect(() => handle.current?.setNight(night), [night]);

  const residents = new Map<string, number>();
  world.population.forEach((r) => residents.set(r.sp, (residents.get(r.sp) ?? 0) + 1));
  const tw = world.thisWeek;
  const nextCabin = CABIN_STEPS[world.cabin.stage];

  return (
    <div className="view">
      <header className="plain-head forest-head">
        <h1>Your forest</h1>
        <p className="muted">Built from every session. Nothing you've built goes away.</p>
      </header>

      <div className="world-frame">
        <canvas ref={canvas} width={240} height={150} className="world-canvas" tabIndex={0} aria-label="Your pixel forest. Drag to look around, tap things for details." />
        <div ref={bubble} className="world-bubble" hidden />
        <button className="world-pan l" onClick={() => handle.current?.panBy(-120)} aria-label="Look left">
          ‹
        </button>
        <button className="world-pan r" onClick={() => handle.current?.panBy(120)} aria-label="Look right">
          ›
        </button>
        <button className="world-night" onClick={() => setNight(night === true ? null : true)} aria-pressed={night === true}>
          {night === true ? "☀︎ Day" : "☾ Night"}
        </button>
      </div>

      <section className={`panel strong-week${tw.strong ? " done" : ""}`}>
        <div className="sw-head">
          <div>
            <h2 className="panel-title">This week</h2>
            <p className="sw-title">
              {tw.strong ? "Strong week ✓" : `${tw.hit} of ${tw.needed} targets for a strong week`}
            </p>
            <p className="muted small">{tw.strong ? "Your new resident has moved in." : `Strong week → ${world.next}`}</p>
          </div>
          <Pips done={tw.hit} target={tw.needed} />
        </div>
        <ul className="sw-goals">
          {tw.goals.map((g) => (
            <li key={g.name} className={g.done >= g.target ? "hit" : ""}>
              <span>{g.name}</span>
              <span className="mono">
                {g.done}/{g.target}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">How it grows</h2>
        <ul className="grow-list">
          {world.groves.map((g) => (
            <li key={g.habit}>
              <span>{g.label}</span>
              <span className="muted">
                {g.sessions} sessions · {g.sessions ? Math.min(6, 1 + Math.floor((g.sessions - 1) / 4)) : 0} trees
              </span>
            </li>
          ))}
          <li>
            <span>Cabin (Create)</span>
            <span className="muted">
              {CABIN_STAGES[world.cabin.stage]}
              {nextCabin ? ` · next at ${nextCabin}` : ""}
            </span>
          </li>
          <li>
            <span>String lights</span>
            <span className="muted">{world.cabin.videos} · one per published video</span>
          </li>
          <li>
            <span>Wildflowers</span>
            <span className="muted">{world.flowers} · supplements & reel-free mornings</span>
          </li>
          <li>
            <span>Northern lights</span>
            <span className="muted">{world.aurora ? `${world.aurora} sleep week${world.aurora > 1 ? "s" : ""} · brighter each time` : "first week on sleep target"}</span>
          </li>
        </ul>
      </section>

      <section className="panel">
        <div className="sw-head">
          <h2 className="panel-title">Residents</h2>
          <span className="muted small">
            {residents.size} of {SPECIES.length} · {world.strongWeeks} strong week{world.strongWeeks === 1 ? "" : "s"}
          </span>
        </div>
        <ul className="residents">
          {SPECIES.map((sp, i) => {
            const n = residents.get(sp.id) ?? 0;
            return (
              <li key={sp.id} className={n ? "" : "locked"}>
                <div className="res-pic">
                  <SpriteIcon id={sp.id} locked={!n} />
                </div>
                <span className="res-name">{n ? sp.name : `Week ${i + 1}`}</span>
                {n > 1 && <span className="res-fam mono">×{n}</span>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
