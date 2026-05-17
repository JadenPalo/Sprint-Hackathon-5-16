import { useEffect, useMemo, useRef, useState } from "react";
import { SectionTitle } from "../components/common/SectionTitle";
import { ZoneZoomEditor } from "../components/map/ZoneZoomEditor";
import { ZoneChatPanel } from "../components/chat/ZoneChatPanel";
import { useStore } from "../context/StoreContext";
import type { Block, Section, Zone } from "../types/inventory";


interface DragState {
  zoneId: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBlockEmoji(block: Block) {
  return block.metadata?.emoji ?? "📦";
}

export function MapPage() {
  const store = useStore();
  const isAdmin = store.userRole === "admin";
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoomedZoneId, setZoomedZoneId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [localZones, setLocalZones] = useState<Zone[]>(store.zones);
  const [newZoneName, setNewZoneName] = useState("");
  const [newZoneColor, setNewZoneColor] = useState("#b45309");
  const [newSectionLabel, setNewSectionLabel] = useState("");
  const [newBlockSectionId, setNewBlockSectionId] = useState<string>("");
  const [newBlockContent, setNewBlockContent] = useState("");
  const [newBlockType, setNewBlockType] = useState<Block["type"]>("text");
  const [newBlockEmoji, setNewBlockEmoji] = useState("📦");

  useEffect(() => {
    setLocalZones(store.zones);
  }, [store.zones]);

  useEffect(() => {
    if (!newBlockSectionId && store.sections.length > 0) {
      setNewBlockSectionId(store.sections[0].id);
    }
  }, [newBlockSectionId, store.sections]);

  const selectedZone = useMemo(
    () => localZones.find((zone) => zone.id === selectedZoneId) ?? null,
    [localZones, selectedZoneId]
  );

  const zoomedZone = useMemo(
    () => localZones.find((zone) => zone.id === zoomedZoneId) ?? null,
    [localZones, zoomedZoneId]
  );

  const currentEmployee = useMemo(
    () =>
      store.employees.find((employee) => employee.id === store.currentEmployeeId) ??
      store.employees[0] ??
      null,
    [store.currentEmployeeId, store.employees]
  );

  const streamIdentity = useMemo(
    () =>
      currentEmployee
        ? {
            id: currentEmployee.id,
            name: currentEmployee.name,
            role: isAdmin ? "admin" : "employee",
          }
        : null,
    [currentEmployee, isAdmin]
  );

  const blockIndex = useMemo(() => {
    return store.sections.reduce<Record<string, Block>>((accumulator, section) => {
      section.blocks.forEach((block) => {
        accumulator[block.id] = block;
      });
      return accumulator;
    }, {});
  }, [store.sections]);

  const blocksByZone = useMemo(() => {
    return localZones.reduce<Record<string, Block[]>>((accumulator, zone) => {
      const zoneBlocks = store.blockPlacements
        .filter((placement) => placement.zoneId === zone.id)
        .map((placement) => blockIndex[placement.blockId])
        .filter((entry): entry is Block => Boolean(entry));
      accumulator[zone.id] = zoneBlocks;
      return accumulator;
    }, {});
  }, [blockIndex, localZones, store.blockPlacements]);

  const zonePlacementMap = useMemo(() => {
    return localZones.reduce<Record<string, typeof store.blockPlacements>>((accumulator, zone) => {
      accumulator[zone.id] = store.blockPlacements.filter((placement) => placement.zoneId === zone.id);
      return accumulator;
    }, {});
  }, [localZones, store.blockPlacements]);

  const placedBlockIds = useMemo(
    () => new Set(store.blockPlacements.map((placement) => placement.blockId)),
    [store.blockPlacements]
  );

  const unplacedBlocksBySection = useMemo(() => {
    return store.sections.reduce<Record<string, Block[]>>((accumulator, section) => {
      accumulator[section.id] = section.blocks.filter((block) => !placedBlockIds.has(block.id));
      return accumulator;
    }, {});
  }, [placedBlockIds, store.sections]);

  function createZoneAtCenter() {
    if (!isAdmin) {
      return;
    }

    const trimmedName = newZoneName.trim();
    const zoneName = trimmedName || `Zone ${store.zones.length + 1}`;

    store.createZone({
      name: zoneName,
      x: 35,
      y: 35,
      width: 20,
      height: 20,
      color: newZoneColor,
    });

    setNewZoneName("");
  }

  function createSectionLane() {
    if (!isAdmin) {
      return;
    }

    store.createSection(newSectionLabel);
    setNewSectionLabel("");
  }

  function createCanvasBlock() {
    if (!isAdmin || !newBlockSectionId) {
      return;
    }

    const content = newBlockContent.trim();
    if (!content) {
      return;
    }

    store.createBlock(newBlockSectionId, newBlockType, content, {
      emoji: newBlockEmoji.trim() || undefined,
    });
    setNewBlockContent("");
    setNewBlockEmoji("📦");
  }

  function startDragging(
    event: React.PointerEvent<HTMLElement>,
    zone: Zone,
    mode: DragState["mode"]
  ) {
    if (!isAdmin) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setSelectedZoneId(zone.id);
    setDragState({
      zoneId: zone.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialX: zone.x,
      initialY: zone.y,
      initialWidth: zone.width,
      initialHeight: zone.height,
    });
  }

  function handleCanvasPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isAdmin || !dragState || !canvasRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const deltaX = ((event.clientX - dragState.startX) / rect.width) * 100;
    const deltaY = ((event.clientY - dragState.startY) / rect.height) * 100;

    setLocalZones((current) =>
      current.map((zone) => {
        if (zone.id !== dragState.zoneId) {
          return zone;
        }

        if (dragState.mode === "move") {
          const nextX = clamp(dragState.initialX + deltaX, 0, 100 - zone.width);
          const nextY = clamp(dragState.initialY + deltaY, 0, 100 - zone.height);
          return { ...zone, x: nextX, y: nextY };
        }

        const nextWidth = clamp(dragState.initialWidth + deltaX, 8, 100 - zone.x);
        const nextHeight = clamp(dragState.initialHeight + deltaY, 8, 100 - zone.y);
        return { ...zone, width: nextWidth, height: nextHeight };
      })
    );
  }

  function stopDragging() {
    if (!isAdmin || !dragState) {
      return;
    }

    const zone = localZones.find((entry) => entry.id === dragState.zoneId);
    if (zone) {
      store.updateZone(zone.id, {
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
      });
    }

    setDragState(null);
  }

  function handleZoneDrop(event: React.DragEvent<HTMLDivElement>, zoneId: string) {
    if (!isAdmin) {
      return;
    }

    event.preventDefault();
    const blockId = event.dataTransfer.getData("text/block-id");
    if (!blockId) {
      return;
    }

    const existing = store.blockPlacements.find((placement) => placement.blockId === blockId);
    store.placeBlock({
      blockId,
      zoneId,
      subzoneId: existing?.subzoneId ?? null,
      x: 50,
      y: 50,
      metadata: existing?.metadata,
    });
  }

  function handleSectionDrop(event: React.DragEvent<HTMLDivElement>, targetSection: Section) {
    if (!isAdmin) {
      return;
    }

    event.preventDefault();
    const blockId = event.dataTransfer.getData("text/block-id");
    const sourceSectionId = event.dataTransfer.getData("text/source-section-id");

    if (!blockId || !sourceSectionId || sourceSectionId === targetSection.id) {
      return;
    }

    store.moveBlock(sourceSectionId, targetSection.id, blockId, targetSection.blocks.length);
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow={isAdmin ? "Map Builder" : "Map Viewer"}
        title="Visual canvas zones"
        description={
          isAdmin
            ? "Create zones, arrange sections, drag blocks into zones, and double-click a zone for aisle-level placement."
            : "View zone layout and block locations. Ask an admin to make map updates."
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_0.9fr]">
        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">
            {isAdmin ? "Zone + canvas controls" : "Canvas sections"}
          </h3>

          {isAdmin ? (
            <div className="mt-4 space-y-4">
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Zone name</span>
                  <input
                    value={newZoneName}
                    onChange={(event) => setNewZoneName(event.target.value)}
                    className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Cold Storage"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Zone color</span>
                  <input
                    type="color"
                    value={newZoneColor}
                    onChange={(event) => setNewZoneColor(event.target.value)}
                    className="h-11 w-full rounded-2xl border-0 bg-slate-50 p-2"
                  />
                </label>
                <button
                  type="button"
                  onClick={createZoneAtCenter}
                  className="w-full rounded-2xl bg-cafe-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cafe-800"
                >
                  Add zone
                </button>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">New section label (optional)</span>
                  <input
                    value={newSectionLabel}
                    onChange={(event) => setNewSectionLabel(event.target.value)}
                    className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Morning Prep Lane"
                  />
                </label>
                <button
                  type="button"
                  onClick={createSectionLane}
                  className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Add section
                </button>
              </div>

              <div className="border-t border-slate-200 pt-4 space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Create block</h4>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Section
                  </span>
                  <select
                    value={newBlockSectionId}
                    onChange={(event) => setNewBlockSectionId(event.target.value)}
                    className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm outline-none"
                  >
                    {store.sections.map((section, index) => (
                      <option key={section.id} value={section.id}>
                        {section.label?.trim() || `Section ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Type
                  </span>
                  <select
                    value={newBlockType}
                    onChange={(event) => setNewBlockType(event.target.value as Block["type"])}
                    className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-3 py-3 text-sm outline-none"
                  >
                    <option value="text">Text</option>
                    <option value="emoji">Emoji</option>
                    <option value="data">Data</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Block text
                  </span>
                  <input
                    value={newBlockContent}
                    onChange={(event) => setNewBlockContent(event.target.value)}
                    className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="Oat milk backup crate"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Emoji (optional)
                  </span>
                  <input
                    value={newBlockEmoji}
                    onChange={(event) => setNewBlockEmoji(event.target.value)}
                    className="soft-ring w-full rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
                    placeholder="📦"
                  />
                </label>
                <button
                  type="button"
                  onClick={createCanvasBlock}
                  className="w-full rounded-2xl bg-cafe-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cafe-800"
                >
                  Add block
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              You have read-only access in employee mode.
            </p>
          )}

          <div className="mt-6 space-y-3">
            {store.sections.map((section, index) => (
              <div
                key={section.id}
                onDragOver={(event) => {
                  if (isAdmin) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => handleSectionDrop(event, section)}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {section.label?.trim() || `Section ${index + 1}`}
                  </p>
                  {isAdmin ? (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => store.reorderSections(index, index - 1)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === store.sections.length - 1}
                        onClick={() => store.reorderSections(index, index + 1)}
                        className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40"
                      >
                        ↓
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-2 space-y-2">
                  {(unplacedBlocksBySection[section.id] ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">No unplaced blocks in this section.</p>
                  ) : (
                    (unplacedBlocksBySection[section.id] ?? []).map((block) => (
                      <div
                        key={block.id}
                        draggable={isAdmin}
                        onDragStart={(event) => {
                          if (!isAdmin) {
                            return;
                          }

                          event.dataTransfer.setData("text/block-id", block.id);
                          event.dataTransfer.setData("text/source-section-id", section.id);
                        }}
                        className={`rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700 ${
                          isAdmin ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                        }`}
                      >
                        <span className="mr-1">{getBlockEmoji(block)}</span>
                        {block.content}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-surface p-5">
          <div
            ref={canvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={stopDragging}
            onPointerLeave={stopDragging}
            className="relative h-[460px] rounded-2xl border border-slate-200 bg-[linear-gradient(0deg,rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:24px_24px]"
          >
            {localZones.map((zone) => {
              const zoneBlocks = blocksByZone[zone.id] ?? [];
              const title = zoneBlocks.map((block) => block.content).join(", ");

              return (
                <div
                  key={zone.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedZoneId(zone.id)}
                  onDoubleClick={() => setZoomedZoneId(zone.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      setSelectedZoneId(zone.id);
                    }
                  }}
                  onPointerDown={isAdmin ? (event) => startDragging(event, zone, "move") : undefined}
                  onDragOver={isAdmin ? (event) => event.preventDefault() : undefined}
                  onDrop={isAdmin ? (event) => handleZoneDrop(event, zone.id) : undefined}
                  className={`absolute rounded-xl border-2 p-2 shadow-soft ${
                    isAdmin ? "cursor-move" : "cursor-default"
                  }`}
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y}%`,
                    width: `${zone.width}%`,
                    height: `${zone.height}%`,
                    borderColor: zone.color,
                    backgroundColor: `${zone.color}22`,
                  }}
                  title={title || "No blocks assigned"}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-slate-700">{zone.name}</span>
                    <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {zonePlacementMap[zone.id]?.length ?? 0}
                    </span>
                  </div>

                  <div className="mt-2 line-clamp-3 text-[10px] text-slate-700">
                    {zoneBlocks.slice(0, 3).map((block) => `${getBlockEmoji(block)} ${block.content}`).join(" · ")}
                  </div>

                  {isAdmin ? (
                    <button
                      type="button"
                      onPointerDown={(event) => startDragging(event, zone, "resize")}
                      className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-cafe-700"
                      aria-label={`Resize ${zone.name}`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Double-click a zone to open zoom mode and place blocks precisely with aisle tags.
          </p>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Zone details</h3>
          {!selectedZone ? (
            <p className="mt-3 text-sm text-slate-600">
              Select a zone on the map to view assigned blocks.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Selected</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedZone.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="rounded-xl bg-slate-100 px-3 py-2">x: {selectedZone.x.toFixed(1)}%</div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">y: {selectedZone.y.toFixed(1)}%</div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">w: {selectedZone.width.toFixed(1)}%</div>
                <div className="rounded-xl bg-slate-100 px-3 py-2">h: {selectedZone.height.toFixed(1)}%</div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blocks inside</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-700">
                  {(zonePlacementMap[selectedZone.id] ?? []).length === 0 ? (
                    <li className="text-slate-500">No blocks assigned yet.</li>
                  ) : (
                    (zonePlacementMap[selectedZone.id] ?? []).map((placement) => {
                      const block = blockIndex[placement.blockId];
                      const emoji = block ? getBlockEmoji(block) : "📦";
                      return (
                        <li key={`${placement.blockId}-${placement.zoneId}`} className="rounded-xl bg-slate-100 px-3 py-2">
                          {emoji} {block?.content ?? placement.blockId} · ({placement.x.toFixed(1)}%,{" "}
                          {placement.y.toFixed(1)}%)
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>

              <ZoneChatPanel
                zone={selectedZone}
                currentUser={streamIdentity}
                employees={store.employees}
                isAdmin={isAdmin}
              />

              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    store.deleteZone(selectedZone.id);
                    setSelectedZoneId(null);
                  }}
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Delete zone
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="card-surface p-5">
        <h3 className="text-base font-semibold text-slate-900">Recent Map Activity</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          {store.mapActivity.length === 0 ? (
            <li className="rounded-xl bg-slate-50 px-3 py-2 text-slate-500">No map updates yet.</li>
          ) : (
            store.mapActivity.slice(0, 10).map((entry) => (
              <li key={entry.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <p>{entry.message}</p>
                <p className="mt-1 text-xs text-slate-500">{new Date(entry.timestamp).toLocaleString()}</p>
              </li>
            ))
          )}
        </ul>
      </div>

      {zoomedZone ? (
        <ZoneZoomEditor
          store={store}
          zone={zoomedZone}
          readOnly={!isAdmin}
          onClose={() => setZoomedZoneId(null)}
        />
      ) : null}
    </div>
  );
}
