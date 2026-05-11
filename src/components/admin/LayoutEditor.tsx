"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import type { Table, TableShape } from "@prisma/client";
import {
  createTable,
  updateTable,
  deleteTable,
  countUpcomingReservations,
} from "@/app/actions/tables";

const LOGICAL_W = 800;
const LOGICAL_H = 500;
const POS_SNAP = 40;
const SIZE_SNAP = 20;
const MIN_SIZE = 40;
const MAX_SIZE = 200;

const COLORS = {
  fill: "#7A9270",
  fillSelected: "#5F7556",
  stroke: "#3D2817",
  strokeSelected: "#B85042",
  label: "#FFFFFF",
  grid: "#EAE0D2",
};

const snap = (v: number, step: number) => Math.round(v / step) * step;
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type Props = {
  initialTables: Table[];
};

export default function LayoutEditor({ initialTables }: Props) {
  const [tables, setTables] = useState<Table[]>(initialTables);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selected = tables.find((t) => t.id === selectedId) ?? null;

  const handleAddTable = () => {
    setError(null);
    const newLabel = `T${tables.length + 1}`;
    const newTable = {
      label: newLabel,
      seats: 4,
      shape: "RECTANGLE" as TableShape,
      x: snap(LOGICAL_W / 2, POS_SNAP),
      y: snap(LOGICAL_H / 2, POS_SNAP),
      width: 80,
      height: 80,
    };
    startTransition(async () => {
      const result = await createTable(newTable);
      if (result.ok && result.data) {
        setTables((prev) => [
          ...prev,
          {
            id: result.data!.id,
            ...newTable,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Table,
        ]);
        setSelectedId(result.data.id);
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  };

  const handleDragEnd = (id: string, x: number, y: number) => {
    const snappedX = snap(x, POS_SNAP);
    const snappedY = snap(y, POS_SNAP);
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, x: snappedX, y: snappedY } : t)),
    );
    startTransition(async () => {
      const result = await updateTable({ id, x: snappedX, y: snappedY });
      if (!result.ok) setError(result.error);
    });
  };

  const handleFieldUpdate = (
    id: string,
    field: "label" | "seats" | "shape" | "width" | "height",
    value: string | number,
  ) => {
    setError(null);
    const table = tables.find((t) => t.id === id);
    if (!table) return;

    const updates: Partial<Table> = { [field]: value };

    if (field === "shape" && value === "CIRCLE") {
      updates.height = table.width;
    }
    if (table.shape === "CIRCLE" && (field === "width" || field === "height")) {
      updates.width = value as number;
      updates.height = value as number;
    }

    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
    startTransition(async () => {
      const result = await updateTable({ id, ...updates });
      if (!result.ok) setError(result.error);
    });
  };

  const handleDelete = async (id: string) => {
    setError(null);
    const countResult = await countUpcomingReservations(id);
    let confirmMsg = "Hapus meja ini?";
    if (countResult.ok && countResult.data && countResult.data.count > 0) {
      confirmMsg = `Meja ini memiliki ${countResult.data.count} reservasi mendatang yang akan ikut terhapus. Lanjutkan?`;
    }
    if (!confirm(confirmMsg)) return;

    startTransition(async () => {
      const result = await deleteTable(id);
      if (result.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
        setSelectedId(null);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white border border-border-warm rounded-lg p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleAddTable}
            disabled={isPending}
            className="px-4 py-2.5 bg-terracotta text-white rounded-md font-medium hover:bg-terracotta-dark transition shadow-sm text-sm disabled:opacity-50"
          >
            + Tambah Meja
          </button>
          <span className="text-sm text-mocha">
            <span className="font-semibold text-espresso">{tables.length}</span>{" "}
            meja
            {isPending && (
              <span className="ml-2 text-xs text-caramel italic">
                Menyimpan...
              </span>
            )}
          </span>
        </div>
        <p className="text-xs text-taupe italic hidden sm:block">
          Drag untuk pindah · Klik untuk pilih
        </p>
      </div>

      {error && (
        <div className="text-sm text-clay-dark bg-clay-subtle border border-clay/30 rounded-md p-3">
          {error}
        </div>
      )}

      {/* Canvas + Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <ResponsiveCanvas
          tables={tables}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onDragEnd={handleDragEnd}
        />

        {/* Desktop side panel */}
        <aside className="hidden lg:block bg-white border border-border-warm rounded-lg p-5 shadow-sm h-fit">
          {selected ? (
            <EditPanel
              table={selected}
              onChange={(field, value) =>
                handleFieldUpdate(selected.id, field, value)
              }
              onDelete={() => handleDelete(selected.id)}
              isPending={isPending}
            />
          ) : (
            <div className="text-center text-sm text-mocha py-12">
              <div className="text-4xl mb-2">👆</div>
              Pilih meja untuk mengedit
            </div>
          )}
        </aside>
      </div>

      {/* Mobile bottom sheet */}
      {selected && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white border-t border-border-warm rounded-t-2xl shadow-2xl max-h-[75vh] overflow-y-auto animate-slide-up">
          <div className="sticky top-0 bg-white border-b border-border-soft px-5 py-3 flex items-center justify-between rounded-t-2xl">
            <div className="font-serif text-lg font-semibold text-espresso">
              Edit Meja {selected.label}
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="p-2 -mr-2 text-mocha hover:text-espresso"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          <div className="p-5">
            <EditPanel
              table={selected}
              onChange={(field, value) =>
                handleFieldUpdate(selected.id, field, value)
              }
              onDelete={() => handleDelete(selected.id)}
              isPending={isPending}
              hideHeader
            />
          </div>
        </div>
      )}

      {/* Spacer untuk bottom sheet biar konten tidak tertutup */}
      {selected && <div className="lg:hidden h-32" aria-hidden />}
    </div>
  );
}

// === Responsive canvas wrapper ===
function ResponsiveCanvas({
  tables,
  selectedId,
  onSelect,
  onDragEnd,
}: {
  tables: Table[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(LOGICAL_W);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.min(entry.contentRect.width, LOGICAL_W));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = containerWidth / LOGICAL_W;
  const renderHeight = LOGICAL_H * scale;

  return (
    <div
      ref={containerRef}
      className="border border-border-warm rounded-lg overflow-hidden bg-cream-light shadow-sm w-full"
    >
      <Stage
        width={containerWidth}
        height={renderHeight}
        scaleX={scale}
        scaleY={scale}
        onClick={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
        onTap={(e) => {
          if (e.target === e.target.getStage()) onSelect(null);
        }}
      >
        <Layer>
          <GridLines />
          {tables.map((t) => (
            <DraggableTable
              key={t.id}
              table={t}
              isSelected={t.id === selectedId}
              onSelect={() => onSelect(t.id)}
              onDragEnd={(x, y) => onDragEnd(t.id, x, y)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function GridLines() {
  const lines: React.ReactElement[] = [];
  for (let x = POS_SNAP; x < LOGICAL_W; x += POS_SNAP) {
    lines.push(
      <Rect
        key={`v${x}`}
        x={x}
        y={0}
        width={1}
        height={LOGICAL_H}
        fill={COLORS.grid}
        listening={false}
      />,
    );
  }
  for (let y = POS_SNAP; y < LOGICAL_H; y += POS_SNAP) {
    lines.push(
      <Rect
        key={`h${y}`}
        x={0}
        y={y}
        width={LOGICAL_W}
        height={1}
        fill={COLORS.grid}
        listening={false}
      />,
    );
  }
  return <>{lines}</>;
}

function DraggableTable({
  table,
  isSelected,
  onSelect,
  onDragEnd,
}: {
  table: Table;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (x: number, y: number) => void;
}) {
  const isCircle = table.shape === "CIRCLE";
  const fill = isSelected ? COLORS.fillSelected : COLORS.fill;
  const stroke = isSelected ? COLORS.strokeSelected : COLORS.stroke;
  const strokeWidth = isSelected ? 3 : 2;

  const halfW = table.width / 2;
  const halfH = table.height / 2;

  return (
    <Group
      x={table.x}
      y={table.y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={onSelect}
      dragBoundFunc={(pos) => {
        const snappedX = clamp(snap(pos.x, POS_SNAP), halfW, LOGICAL_W - halfW);
        const snappedY = clamp(snap(pos.y, POS_SNAP), halfH, LOGICAL_H - halfH);
        return { x: snappedX, y: snappedY };
      }}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
    >
      {isCircle ? (
        <Circle
          radius={table.width / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <Rect
          width={table.width}
          height={table.height}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cornerRadius={6}
          offsetX={table.width / 2}
          offsetY={table.height / 2}
        />
      )}
      <Text
        text={`${table.label}\n${table.seats} seats`}
        fontSize={12}
        fontStyle="bold"
        fill={COLORS.label}
        align="center"
        width={table.width}
        offsetX={table.width / 2}
        offsetY={isCircle ? 12 : table.height / 2 - 8}
        listening={false}
      />
    </Group>
  );
}

function EditPanel({
  table,
  onChange,
  onDelete,
  isPending,
  hideHeader = false,
}: {
  table: Table;
  onChange: (
    field: "label" | "seats" | "shape" | "width" | "height",
    value: string | number,
  ) => void;
  onDelete: () => void;
  isPending: boolean;
  hideHeader?: boolean;
}) {
  const isCircle = table.shape === "CIRCLE";

  const handleSize = (field: "width" | "height", rawValue: string) => {
    const parsed = parseInt(rawValue) || MIN_SIZE;
    const snapped = snap(clamp(parsed, MIN_SIZE, MAX_SIZE), SIZE_SNAP);
    onChange(field, snapped);
  };

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h3 className="font-serif text-lg font-semibold text-espresso">
            Meja {table.label}
          </h3>
          <p className="text-xs text-taupe mt-0.5">
            Posisi: ({Math.round(table.x)}, {Math.round(table.y)})
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
          Label
        </label>
        <input
          type="text"
          value={table.label}
          onChange={(e) => onChange("label", e.target.value)}
          className="w-full px-3 py-2.5 bg-cream-light border border-border-warm rounded-md text-espresso focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition text-sm"
          maxLength={10}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
          Jumlah kursi
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          value={table.seats}
          onChange={(e) => onChange("seats", parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2.5 bg-cream-light border border-border-warm rounded-md text-espresso focus:outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20 transition text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
          Bentuk
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ShapeOption
            value="RECTANGLE"
            current={table.shape}
            onClick={() => onChange("shape", "RECTANGLE")}
          />
          <ShapeOption
            value="CIRCLE"
            current={table.shape}
            onClick={() => onChange("shape", "CIRCLE")}
          />
        </div>
      </div>

      {isCircle ? (
        <div>
          <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
            Diameter ({table.width}px)
          </label>
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={SIZE_SNAP}
            value={table.width}
            onChange={(e) => handleSize("width", e.target.value)}
            className="w-full h-2"
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
              Lebar ({table.width}px)
            </label>
            <input
              type="range"
              min={MIN_SIZE}
              max={MAX_SIZE}
              step={SIZE_SNAP}
              value={table.width}
              onChange={(e) => handleSize("width", e.target.value)}
              className="w-full h-2"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-mocha uppercase tracking-wide mb-1.5">
              Tinggi ({table.height}px)
            </label>
            <input
              type="range"
              min={MIN_SIZE}
              max={MAX_SIZE}
              step={SIZE_SNAP}
              value={table.height}
              onChange={(e) => handleSize("height", e.target.value)}
              className="w-full h-2"
            />
          </div>
        </>
      )}

      <hr className="border-border-soft" />

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="w-full px-4 py-2.5 text-sm border border-clay/30 text-clay-dark rounded-md hover:bg-clay-subtle transition font-medium disabled:opacity-50"
      >
        Hapus Meja
      </button>
    </div>
  );
}

function ShapeOption({
  value,
  current,
  onClick,
}: {
  value: TableShape;
  current: TableShape;
  onClick: () => void;
}) {
  const isActive = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2.5 text-sm rounded-md border transition font-medium ${
        isActive
          ? "border-terracotta bg-terracotta-subtle text-terracotta-dark"
          : "border-border-warm text-cocoa hover:bg-cream-dark"
      }`}
    >
      {value === "RECTANGLE" ? "▭ Persegi" : "◯ Lingkaran"}
    </button>
  );
}