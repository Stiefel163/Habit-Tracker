import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastMsg {
  id: number;
  text: string;
  undo?: () => void;
}

const Ctx = createContext<(text: string, undo?: () => void) => void>(() => {});

/** One short confirmation at a time, with optional Undo. Undo beats "are you sure?" dialogs. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number>();
  const show = useCallback((text: string, undo?: () => void) => {
    window.clearTimeout(timer.current);
    setMsg({ id: Date.now(), text, undo });
    timer.current = window.setTimeout(() => setMsg(null), undo ? 4500 : 2200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {msg && (
          <div className="toast" key={msg.id}>
            <span>{msg.text}</span>
            {msg.undo && (
              <button
                onClick={() => {
                  msg.undo?.();
                  setMsg(null);
                }}
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
