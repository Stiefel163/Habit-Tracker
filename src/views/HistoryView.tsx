import { useMemo, useState } from "react";
import { useStore } from "../data/StoreProvider";
import { CLEAN_ITEMS, SPLITS, cleanCount, formatDuration, journey, validLogs } from "../domain/rpg";
import type { ActivityLog } from "../domain/types";
import { formatLong, type DayKey } from "../lib/date";

function describe(l: ActivityLog, nth: Map<string, number>): { icon: string; title: string; note?: string } {
  switch (l.kind) {
    case "strength":
      return { icon: "🦾", title: "Strength workout", note: [l.split && SPLITS.find((s) => s.id === l.split)?.label, l.minutes && formatDuration(l.minutes)].filter(Boolean).join(" · ") || undefined };
    case "swim":
      return { icon: "🏊", title: "Swim", note: l.minutes ? formatDuration(l.minutes) : undefined };
    case "spanish":
      return { icon: "🇪🇸", title: `Spanish Day ${nth.get(l.id) ?? ""}`, note: l.better ? `“${l.better}”` : undefined };
    case "video":
      return { icon: "🎬", title: `Video #${nth.get(l.id) ?? ""} published`, note: [l.title, l.better && `“${l.better}”`].filter(Boolean).join(" · ") || undefined };
    case "bogen":
      return { icon: "🚗", title: `${l.count} ${l.count === 1 ? "Bogen" : "Bögen"}` };
    case "focus":
      return { icon: "🧠", title: `${formatDuration(l.minutes)} focus`, note: l.category };
    case "clean":
      return { icon: "🧘", title: cleanCount(l) === 3 ? "Clean day" : `Clean day ${cleanCount(l)} / 3`, note: CLEAN_ITEMS.map((c) => `${l[c.id] ? "✓" : "✗"} ${c.label}`).join(" · ") };
  }
}

export function HistoryView({ today }: { today: DayKey }) {
  const { data, removeLog } = useStore();
  const [armed, setArmed] = useState<string | null>(null);
  const logs = useMemo(() => validLogs(data.logs), [data.logs]);
  const nth = useMemo(() => {
    const m = new Map<string, number>();
    for (const k of ["spanish", "video"] as const) journey(logs, k).forEach((x) => m.set(x.log.id, x.n));
    return m;
  }, [logs]);
  const byDay = useMemo(() => {
    const g = new Map<DayKey, ActivityLog[]>();
    for (const l of [...logs].sort((a, b) => b.date.localeCompare(a.date) || b.at.localeCompare(a.at))) g.set(l.date, [...(g.get(l.date) ?? []), l]);
    return [...g.entries()];
  }, [logs]);

  return (
    <div className="view">
      <header className="head">
        <h1>History</h1>
        <p className="muted">Every rep, in order.</p>
      </header>
      {byDay.length === 0 && <p className="panel muted">Nothing logged yet. Your first action from Home shows up here.</p>}
      {byDay.map(([day, items]) => (
        <section key={day} className="day">
          <h2 className="section-title">{day === today ? "Today" : formatLong(day)}</h2>
          <ul className="entries">
            {items.map((l) => {
              const d = describe(l, nth);
              return (
                <li key={l.id}>
                  <span className="e-icon" aria-hidden="true">
                    {d.icon}
                  </span>
                  <span className="e-text">
                    <span className="e-title">+ {d.title}</span>
                    {d.note && <span className="e-note">{d.note}</span>}
                  </span>
                  {armed === l.id ? (
                    <button
                      className="text-btn danger-text"
                      onClick={() => {
                        removeLog(l.id);
                        setArmed(null);
                      }}
                    >
                      Remove?
                    </button>
                  ) : (
                    <button className="icon-btn small" onClick={() => setArmed(l.id)} aria-label={`Remove ${d.title}`}>
                      ⋯
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
