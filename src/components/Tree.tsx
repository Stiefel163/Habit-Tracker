import { HABIT_BY_ID } from "../domain/habits";
import { stageOf } from "../domain/progress";
import type { HabitId } from "../domain/types";

/** Where fruits hang, in the order habits get done. Coordinates are in the 200×200 canopy space. */
const FRUIT_SLOTS = [
  [82, 72],
  [118, 66],
  [100, 98],
  [66, 100],
  [134, 98],
  [96, 50],
  [124, 84],
  [76, 54],
];
const BLOSSOMS = [
  [62, 80],
  [140, 76],
  [88, 40],
  [116, 42],
  [52, 104],
  [148, 104],
  [104, 118],
];

/**
 * Today's tree. `p` (0..1) is the share of habits done; it moves through 6 clear stages:
 * seed → sprout → sapling → young tree → tree → full tree (blossoms).
 * Each done habit hangs one fruit in that habit's color.
 */
export function Tree({ p, done, size = 220, mini = false, label }: { p: number; done: HabitId[]; size?: number; mini?: boolean; label?: string }) {
  const stage = stageOf(p);
  const trunk = stage <= 1 ? 0 : 0.35 + 0.65 * Math.min(1, (stage - 1) / 4);
  const canopy = stage <= 1 ? 0 : 0.3 + 0.7 * Math.min(1, (stage - 1) / 4);
  const trunkTop = 182 - 92 * trunk;
  const dy = trunkTop - 90;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`tree${mini ? " mini" : ""} stage-${stage}`}
      role="img"
      aria-label={label ?? `Tree at stage ${stage + 1} of 6`}
    >
      {!mini && <circle cx="100" cy="110" r="88" className="tree-halo" />}
      <ellipse cx="100" cy="184" rx={mini ? 60 : 72} ry="11" className="tree-ground" />

      {stage === 0 && (
        <g className="seed">
          <ellipse cx="100" cy="178" rx="7" ry="5" className="tree-seed" />
          {!mini && <path d="M100 173 q2 -6 6 -8" className="tree-stem" fill="none" strokeWidth="2.5" strokeLinecap="round" />}
        </g>
      )}

      {stage === 1 && (
        <g className="sprout">
          <path d="M100 182 C100 168 99 160 100 150" className="tree-stem" fill="none" strokeWidth="4" strokeLinecap="round" />
          <path d="M100 156 C88 150 82 140 84 132 C94 134 100 144 100 156 Z" className="leaf-a" />
          <path d="M100 152 C112 146 118 136 116 128 C106 130 100 140 100 152 Z" className="leaf-b" />
        </g>
      )}

      {stage >= 2 && (
        <>
          <g className="trunk" style={{ transform: `scaleY(${trunk})`, transformOrigin: "100px 182px" }}>
            <path d="M93 182 C95 150 96 120 98 90 L102 90 C104 120 105 150 107 182 Z" className="tree-trunk" />
            <path d="M99 130 C90 122 84 116 78 108" className="tree-branch" fill="none" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M101 118 C110 110 116 104 122 96" className="tree-branch" fill="none" strokeWidth="3.5" strokeLinecap="round" />
          </g>
          <g className="canopy" style={{ transform: `translate(0px, ${dy}px) scale(${canopy})`, transformOrigin: "100px 120px" }}>
            <circle cx="70" cy="96" r="30" className="leaf-b" />
            <circle cx="130" cy="96" r="30" className="leaf-b" />
            <circle cx="100" cy="80" r="44" className="leaf-a" />
            <circle cx="80" cy="60" r="26" className="leaf-a" />
            <circle cx="122" cy="62" r="26" className="leaf-a" />
            <circle cx="100" cy="44" r="22" className="leaf-c" />
            <circle cx="82" cy="54" r="12" className="leaf-hi" />
            <circle cx="64" cy="88" r="9" className="leaf-hi" />
            {stage === 5 &&
              BLOSSOMS.map(([x, y], i) => (
                <g key={`b${i}`} className="blossom" style={{ animationDelay: `${i * 60}ms` }}>
                  {[0, 72, 144, 216, 288].map((a) => (
                    <circle key={a} cx={x + 4 * Math.cos((a * Math.PI) / 180)} cy={y + 4 * Math.sin((a * Math.PI) / 180)} r="3" className="petal" />
                  ))}
                  <circle cx={x} cy={y} r="2" className="petal-core" />
                </g>
              ))}
            {done.slice(0, FRUIT_SLOTS.length).map((h, i) => {
              const [x, y] = FRUIT_SLOTS[i];
              return (
                <g key={h} className="fruit">
                  <circle cx={x} cy={y} r="7" fill={HABIT_BY_ID[h].color} />
                  <circle cx={x - 2.2} cy={y - 2.4} r="2" fill="#fff" opacity="0.55" />
                </g>
              );
            })}
          </g>
        </>
      )}
    </svg>
  );
}
