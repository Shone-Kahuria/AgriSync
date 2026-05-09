import { useState, useEffect } from "react";

let _dispatch = null;
let _nextId = 0;

export const toast = {
  success: (msg, sub) => _dispatch?.({ type: "success", msg, sub, id: ++_nextId }),
  error:   (msg, sub) => _dispatch?.({ type: "error",   msg, sub, id: ++_nextId }),
  info:    (msg, sub) => _dispatch?.({ type: "info",    msg, sub, id: ++_nextId }),
  warning: (msg, sub) => _dispatch?.({ type: "warning", msg, sub, id: ++_nextId }),
};

const ICONS = { success: "✓", error: "✕", warning: "⚠", info: "i" };

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _dispatch = ({ id, type, msg, sub }) => {
      setToasts((prev) => [...prev, { id, type, msg, sub, exiting: false }]);
      setTimeout(() => {
        setToasts((prev) =>
          prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
        );
      }, 2800);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    };
    return () => { _dispatch = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="toast-stack" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}${t.exiting ? " exiting" : ""}`}
          role="alert"
        >
          <span className="toast-icon">{ICONS[t.type]}</span>
          <div className="toast-body">
            <p className="toast-msg">{t.msg}</p>
            {t.sub && <p className="toast-sub">{t.sub}</p>}
          </div>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
}
