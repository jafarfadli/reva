"use client";

import { useState, useTransition } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import type { Table, TableShape } from "@prisma/client";
import {
  createTable,
  updateTable,
  deleteTable,
  countUpcomingReservations,
} from "@/app/actions/tables";

const CANVAS_W = 800;
const CANVAS_H = 500;
const POS_SNAP = 20;   // posisi snap ke 20px (sesuai grid)
const SIZE_SNAP = 20;  // dimensi snap ke 20px
const MIN_SIZE = 40;
const MAX_SIZE = 200;

const COLORS = {
  fill: "#22c55e",
  fillSelected: "#16a34a",
  stroke: "#1f2937",
  strokeSelected: "#fbbf24",
  label: "#ffffff",
  grid: "#e5e7eb",
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

  // === Add ===
  const handleAddTable = () => {
    setError(null);
    const newLabel = `T${tables.length + 1}`;
    const newTable = {
      label: newLabel,
      seats: 4,
      shape: "RECTANGLE" as TableShape,
      x: snap(CANVAS_W / 2, POS_SNAP),
      y: snap(CANVAS_H / 2, POS_SNAP),
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

  // === Drag (posisi) ===
  const handleDragEnd = (id: string, x: number, y: number) => {
    const snappedX = snap(x, POS_SNAP);
    const snappedY = snap(y, POS_SNAP);
    setTables((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, x: snappedX, y: snappedY } : t,
      ),
    );
    startTransition(async () => {
      const result = await updateTable({ id, x: snappedX, y: snappedY });
      if (!result.ok) setError(result.error);
    });
  };

  // === Update field ===
  const handleFieldUpdate = (
    id: string,
    field: "label" | "seats" | "shape" | "width" | "height",
    value: string | number,
  ) => {
    setError(null);
    const table = tables.find((t) => t.id === id);
    if (!table) return;

    const updates: Partial<Table> = { [field]: value };

    // Saat shape berubah ke CIRCLE, sync height = width supaya proporsional
    if (field === "shape" && value === "CIRCLE") {
      updates.height = table.width;
    }
    // Saat shape CIRCLE dan dimensi berubah, jaga width = height
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

  // === Delete ===
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddTable}
            disabled={isPending}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            + Tambah Meja
          </button>
          <span className="text-sm text-gray-500">
            {tables.length} meja
            {isPending && (
              <span className="ml-2 text-xs text-amber-600">Menyimpan...</span>
            )}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          Drag meja untuk pindah · Klik untuk pilih · Posisi snap ke grid
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
          <Stage
            width={CANVAS_W}
            height={CANVAS_H}
            onClick={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
            onTap={(e) => {
              if (e.target === e.target.getStage()) setSelectedId(null);
            }}
          >
            <Layer>
              <GridLines />
              {tables.map((t) => (
                <DraggableTable
                  key={t.id}
                  table={t}
                  isSelected={t.id === selectedId}
                  onSelect={() => setSelectedId(t.id)}
                  onDragEnd={(x, y) => handleDragEnd(t.id, x, y)}
                />
              ))}
            </Layer>
          </Stage>
        </div>

        <aside className="bg-white border rounded-lg p-4">
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
            <div className="text-center text-sm text-gray-500 py-8">
              Pilih meja untuk mengedit
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ========== Sub-components ==========

function GridLines() {
  const lines: React.ReactElement[] = [];
  for (let x = POS_SNAP; x < CANVAS_W; x += POS_SNAP) {
    lines.push(
      <Rect
        key={`v${x}`}
        x={x}
        y={0}
        width={1}
        height={CANVAS_H}
        fill={COLORS.grid}
        listening={false}
      />,
    );
  }
  for (let y = POS_SNAP; y < CANVAS_H; y += POS_SNAP) {
    lines.push(
      <Rect
        key={`h${y}`}
        x={0}
        y={y}
        width={CANVAS_W}
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
      // Snap visual selama drag berlangsung
      dragBoundFunc={(pos) => {
        const snappedX = clamp(snap(pos.x, POS_SNAP), halfW, CANVAS_W - halfW);
        const snappedY = clamp(snap(pos.y, POS_SNAP), halfH, CANVAS_H - halfH);
        return { x: snappedX, y: snappedY };
      }}
      onDragEnd={(e) => {
        onDragEnd(e.target.x(), e.target.y());
      }}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "move";
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = "default";
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
}: {
  table: Table;
  onChange: (
    field: "label" | "seats" | "shape" | "width" | "height",
    value: string | number,
  ) => void;
  onDelete: () => void;
  isPending: boolean;
}) {
  const isCircle = table.shape === "CIRCLE";

  const handleSize = (
    field: "width" | "height",
    rawValue: string,
  ) => {
    const parsed = parseInt(rawValue) || MIN_SIZE;
    const snapped = snap(clamp(parsed, MIN_SIZE, MAX_SIZE), SIZE_SNAP);
    onChange(field, snapped);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900 mb-1">
          Edit Meja {table.label}
        </h3>
        <p className="text-xs text-gray-500">
          Posisi: ({Math.round(table.x)}, {Math.round(table.y)})
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Label
        </label>
        <input
          type="text"
          value={table.label}
          onChange={(e) => onChange("label", e.target.value)}
          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          maxLength={10}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Jumlah kursi
        </label>
        <input
          type="number"
          min={1}
          max={20}
          value={table.seats}
          onChange={(e) => onChange("seats", parseInt(e.target.value) || 1)}
          className="w-full border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
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
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Diameter ({table.width}px)
          </label>
          <input
            type="range"
            min={MIN_SIZE}
            max={MAX_SIZE}
            step={SIZE_SNAP}
            value={table.width}
            onChange={(e) => handleSize("width", e.target.value)}
            className="w-full"
          />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lebar ({table.width}px)
            </label>
            <input
              type="range"
              min={MIN_SIZE}
              max={MAX_SIZE}
              step={SIZE_SNAP}
              value={table.width}
              onChange={(e) => handleSize("width", e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tinggi ({table.height}px)
            </label>
            <input
              type="range"
              min={MIN_SIZE}
              max={MAX_SIZE}
              step={SIZE_SNAP}
              value={table.height}
              onChange={(e) => handleSize("height", e.target.value)}
              className="w-full"
            />
          </div>
        </>
      )}

      <hr />

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="w-full px-3 py-2 text-sm border border-red-200 text-red-700 rounded hover:bg-red-50 disabled:opacity-50"
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
      className={`px-3 py-2 text-xs rounded border ${
        isActive
          ? "border-green-600 bg-green-50 text-green-800 font-medium"
          : "border-gray-200 text-gray-700 hover:bg-gray-50"
      }`}
    >
      {value === "RECTANGLE" ? "▭ Persegi" : "◯ Lingkaran"}
    </button>
  );
}