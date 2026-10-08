import { Sheet } from "../components/ui";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { entriesOn } from "../domain/status";
import type { SheetProps } from "./common";

export function NoReelsSheet({ date, onClose }: SheetProps) {
  const { data, setSingle, restore } = useStore();
  const toast = useToast();
  const existing = entriesOn(data.entries, date, "noReels")[0];

  const save = (yes: boolean) => {
    const { removed, added } = setSingle({ date, habit: "noReels", subtype: yes ? "yes" : "no", state: yes ? "done" : "skipped" });
    onClose();
    toast(yes ? "Good start to the day" : "Logged. Tomorrow is a new morning.", () => restore([added], removed));
  };

  return (
    <Sheet title="No Reels After Waking" onClose={onClose}>
      <p className="sheet-sub rule">{data.settings.noReelsRule}</p>
      <div className="tiles two">
        <button className={`tile${existing?.subtype === "yes" ? " selected" : ""}`} onClick={() => save(true)}>
          <span className="tile-icon" aria-hidden="true">
            ☀️
          </span>
          <span>Got up first</span>
        </button>
        <button className={`tile muted${existing?.subtype === "no" ? " selected" : ""}`} onClick={() => save(false)}>
          <span className="tile-icon" aria-hidden="true">
            📱
          </span>
          <span>Scrolled first</span>
        </button>
      </div>
    </Sheet>
  );
}
