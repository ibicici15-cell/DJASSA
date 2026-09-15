import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }, []);

  function dismiss(id) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2.5 w-[calc(100%-2rem)] max-w-sm px-4 sm:px-0 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="alert"
            className="pointer-events-auto w-full fiche rounded-xl shadow-xl px-4 py-3.5 flex items-start gap-3 animate-toast-in"
          >
            <span className={`shrink-0 mt-0.5 ${
              t.type === "error" ? "text-ocre-500" : t.type === "success" ? "text-indigo-500" : "text-encre-700"
            }`}>
              {t.type === "error" ? <XCircle className="w-5 h-5" />
                : t.type === "success" ? <CheckCircle2 className="w-5 h-5" />
                : <Info className="w-5 h-5" />}
            </span>
            <p className="text-sm text-encre-900 flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="shrink-0 text-encre-700/40 hover:text-encre-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
