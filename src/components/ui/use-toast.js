import * as React from "react";

// Estado compartilhado compatível com o Toaster legado.
// Sem dependência de Base44, sem alteração no fluxo jurídico.
const listeners = new Set();
let state = { toasts: [] };
let nextId = 0;
const notify = () => { for (const listener of listeners) listener(); };
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const getSnapshot = () => state;

function dismiss(id) {
  state = { toasts: id == null ? [] : state.toasts.filter(item => item.id !== String(id)) };
  notify();
}

function toast({ ...options } = {}) {
  const id = String(++nextId);
  const update = next => {
    state = { toasts: state.toasts.map(item => item.id === id ? { ...item, ...next, id } : item) };
    notify();
  };
  const item = { ...options, id, open: true, onOpenChange: open => { if (!open) dismiss(id); } };
  state = { toasts: [item, ...state.toasts].slice(0, 5) };
  notify();
  return { id, dismiss: () => dismiss(id), update };
}

function useToast() {
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { ...snapshot, toast, dismiss };
}

export { useToast, toast, dismiss };
