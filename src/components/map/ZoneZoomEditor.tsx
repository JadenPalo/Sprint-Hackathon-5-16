import { useMemo, useState } from "react";
import type { AppStore } from "../../hooks/useAppState";
import type { Block, Zone } from "../../types/inventory";

interface ZoneZoomEditorProps {
  store: AppStore;
  zone: Zone;
  readOnly: boolean;
  onClose: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBlockEmoji(block: Block) {
  return block.metadata?.emoji ?? "📦";
}

export function ZoneZoomEditor({ store, zone, readOnly, onClose }: ZoneZoomEditorProps) {
  const [subzoneName, setSubzoneName] = useState("");
  const [aisleNumber, setAisleNumber] = useState("");

  const zoneSubzones = useMemo(
    () => store.subzones.filter((subzone) => subzone.zoneId === zone.id),
    [store.subzones, zone.id]
  );

  const blockIndex = useMemo(() => {
    return store.sections.reduce<Record<string, Block>>((accumulator, section) => {
      section.blocks.forEach((block) => {
        accumulator[block.id] = block;
      });
      return accumulator;
    }, {});
  }, [store.sections]);

  const zonePlacements = useMemo(
    () => store.blockPlacements.filter((placement) => placement.zoneId === zone.id),
    [store.blockPlacements, zone.id]
  );

  const zoneBlocks = useMemo(
    () =>
      zonePlacements
        .map((placement) => blockIndex[placement.blockId])
        .filter((block): block is Block => Boolean(block)),
    [blockIndex, zonePlacements]
  );

  function addSubzone() {
    if (readOnly) {
      return;
    }

    const trimmedName = subzoneName.trim();
    if (!trimmedName) {
      return;
    }

    store.createSubzone({
      zoneId: zone.id,
      name: trimmedName,
      x: 20,
      y: 20,
      width: 28,
      height: 24,
      aisleNumber: aisleNumber.trim() || undefined,
    });

    setSubzoneName("");
    setAisleNumber("");
  }

  function placeBlock(blockId: string, x: number, y: number, subzoneId?: string | null) {
    if (readOnly) {
      return;
    }

    store.placeBlock({
      blockId,
      zoneId: zone.id,
      subzoneId: subzoneId ?? null,
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
      metadata: {
        aisleNumber: aisleNumber.trim() || undefined,
      },
    });
  }

  function handleCanvasDrop(
    event: React.DragEvent<HTMLDivElement>,
    subzoneId?: string | null
  ) {
    if (readOnly) {
      return;
    }

    event.preventDefault();
    const blockId = event.dataTransfer.getData("text/block-id");
    if (!blockId) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    placeBlock(blockId, x, y, subzoneId);
  }

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="mx-auto grid h-full max-w-7xl gap-4 rounded-3xl bg-white p-4 xl:grid-cols-[0.95fr_1.15fr_0.9fr]">
        <div className="card-surface p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Zone zoom: {zone.name}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            {readOnly
              ? "Read-only mode enabled for staff."
              : "Drop blocks precisely and create aisle-tagged subzones."}
          </p>

          {!readOnly ? (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Subzone name</span>
                <input
                  value={subzoneName}
                  onChange={(event) => setSubzoneName(event.target.value)}
                  className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="Freezer Bay"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Aisle number</span>
                <input
                  value={aisleNumber}
                  onChange={(event) => setAisleNumber(event.target.value)}
                  className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                  placeholder="A-12"
                />
              </label>
              <button
                type="button"
                onClick={addSubzone}
                className="w-full rounded-2xl bg-cafe-700 px-4 py-3 text-sm font-semibold text-white"
              >
                Add subzone
              </button>
            </div>
          ) : null}
        </div>

        <div className="card-surface p-4">
          <div
            className="relative h-[70vh] rounded-2xl border border-slate-200 bg-[linear-gradient(0deg,rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:24px_24px]"
            onDragOver={(event) => {
              if (!readOnly) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => handleCanvasDrop(event)}
          >
            {zoneSubzones.map((subzone) => (
              <div
                key={subzone.id}
                className="absolute rounded-xl border-2 border-cafe-300 bg-cafe-100/50 p-2"
                style={{
                  left: `${subzone.x}%`,
                  top: `${subzone.y}%`,
                  width: `${subzone.width}%`,
                  height: `${subzone.height}%`,
                }}
                onDragOver={(event) => {
                  if (!readOnly) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => handleCanvasDrop(event, subzone.id)}
              >
                <p className="truncate text-xs font-semibold text-cafe-900">
                  {subzone.name}
                  {subzone.aisleNumber ? ` · Aisle ${subzone.aisleNumber}` : ""}
                </p>
              </div>
            ))}

            {zonePlacements.map((placement) => {
              const block = blockIndex[placement.blockId];
              if (!block) {
                return null;
              }

              const aisle = placement.metadata?.aisleNumber;
              return (
                <div
                  key={`${placement.blockId}-${placement.zoneId}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white shadow-soft"
                  style={{ left: `${placement.x}%`, top: `${placement.y}%` }}
                  title={`${block.content}${aisle ? ` · Aisle ${aisle}` : ""}`}
                >
                  {getBlockEmoji(block)} {block.content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-surface p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Zone blocks</h4>
          <div className="mt-3 space-y-2">
            {zoneBlocks.length === 0 ? (
              <p className="text-sm text-slate-500">No blocks assigned to this zone.</p>
            ) : (
              zoneBlocks.map((block) => (
                <div
                  key={block.id}
                  draggable={!readOnly}
                  onDragStart={(event) => {
                    if (!readOnly) {
                      event.dataTransfer.setData("text/block-id", block.id);
                    }
                  }}
                  className={`rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 ${
                    readOnly ? "cursor-default" : "cursor-grab"
                  }`}
                >
                  {getBlockEmoji(block)} {block.content}
                </div>
              ))
            )}
          </div>

          <h4 className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Placements</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {zonePlacements.length === 0 ? (
              <li className="text-slate-500">No precise placements yet.</li>
            ) : (
              zonePlacements.map((placement) => {
                const block = blockIndex[placement.blockId];
                const emoji = block ? getBlockEmoji(block) : "📦";
                return (
                  <li key={`${placement.blockId}-${placement.zoneId}`} className="rounded-xl bg-slate-100 px-3 py-2">
                    {emoji} {block?.content ?? placement.blockId} — ({placement.x.toFixed(1)}%,{" "}
                    {placement.y.toFixed(1)}%)
                    {placement.metadata?.aisleNumber ? ` · Aisle ${placement.metadata.aisleNumber}` : ""}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
