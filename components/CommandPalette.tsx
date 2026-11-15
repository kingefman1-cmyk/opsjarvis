"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type Command = {
  id: string;
  label: string;
  hint?: string;
  /** Short keycap shown on the right, e.g. "J K" */
  keys?: string;
  run: () => void;
};

type Props = { open: boolean; onClose: () => void; commands: Command[] };

/**
 * Zero-dependency ⌘K palette: a filtered list of actions with arrow-key navigation.
 * Opening/closing is owned by the parent (which also owns the global key listener).
 */
export default function CommandPalette({ open, onClose, commands }: Props) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(s));
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setIdx(0), [q]);

  if (!open) return null;

  const fire = (c: Command | undefined) => {
    if (!c) return;
    onClose();
    c.run();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose} role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-ink-600 bg-ink-950 shadow-2xl ring-1 ring-white/5" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-ink-700 px-4">
          <span className="text-slate-500">⌘</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setIdx((i) => Math.min(i + 1, list.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setIdx((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                fire(list[idx]);
              } else if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Type a command…"
            className="w-full bg-transparent py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none"
            aria-label="Search commands"
          />
          <kbd className="rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto py-1" role="listbox">
          {list.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">No matching command.</li>}
          {list.map((c, i) => (
            <li key={c.id} role="option" aria-selected={i === idx}>
              <button
                onMouseEnter={() => setIdx(i)}
                onClick={() => fire(c)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left ${i === idx ? "bg-ink-800 text-white" : "text-slate-300 hover:bg-ink-850"}`}
              >
                <span>
                  <span className="text-sm">{c.label}</span>
                  {c.hint && <span className="ml-2 text-[11px] text-slate-500">{c.hint}</span>}
                </span>
                {c.keys && <kbd className="shrink-0 rounded border border-ink-600 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">{c.keys}</kbd>}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 border-t border-ink-700 px-4 py-2 text-[10px] text-slate-500">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> run</span>
          <span className="ml-auto">Keyboard triage: <kbd className="font-mono">J</kbd>/<kbd className="font-mono">K</kbd> move · <kbd className="font-mono">A</kbd> approve · <kbd className="font-mono">R</kbd> reject · <kbd className="font-mono">U</kbd> undo</span>
        </div>
      </div>
    </div>
  );
}
