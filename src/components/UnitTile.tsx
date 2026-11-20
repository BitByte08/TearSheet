"use client";

import type { Unit } from "@/lib/doc";

const BG = ["#4a3438", "#4a4034", "#34443a", "#34404a", "#3e344a", "#4a3444"];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

interface Props {
  unit: Unit;
  selected?: boolean;
  draggable?: boolean;
  onSelect?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export function UnitTile({ unit, selected, draggable, onSelect, onDragStart, onDrop }: Props) {
  const src = unit.localImage ?? unit.image;
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
      onDrop={onDrop}
      onClick={onSelect}
      title={unit.name}
      className={`group flex w-[76px] flex-col items-center gap-1 rounded-small p-1 text-center transition-colors ${
        selected ? "bg-surface-hover ring-2 ring-accent" : "hover:bg-surface-hover"
      } ${draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} className="size-16 rounded-small object-cover" />
      ) : (
        <span
          className="grid size-16 place-items-center rounded-small text-heading-4 font-medium text-ink"
          style={{ background: BG[hash(unit.name) % BG.length] }}
        >
          {unit.name.slice(0, 2)}
        </span>
      )}
      <span className="w-full truncate text-caption text-ink-soft">{unit.name}</span>
    </button>
  );
}
