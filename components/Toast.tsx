"use client";

import { createContext, useCallback, useContext, useState } from "react";

type Kind = "info" | "success" | "error";
interface Toast { id: number; text: string; kind: Kind }

const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, kind: Kind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast" data-kind={t.kind}>
            <span aria-hidden="true">{t.kind === "success" ? "✅" : t.kind === "error" ? "⚠️" : "✨"}</span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
