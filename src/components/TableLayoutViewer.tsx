"use client";

import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import type { TableWithStatus } from "@/lib/types";

type Props = {
  tables: TableWithStatus[];
  width?: number;
  height?: number;
  onTableClick?: (table: TableWithStatus) => void;
};

const COLORS = {
  free: "#22c55e",
  occupied: "#ef4444",
  stroke: "#1f2937",
  label: "#ffffff",
};

export default function TableLayoutViewer({
  tables,
  width = 800,
  height = 500,
  onTableClick,
}: Props) {
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50 inline-block">
      <Stage width={width} height={height}>
        <Layer>
          {tables.map((t) => {
            const fill = t.isOccupied ? COLORS.occupied : COLORS.free;
            const isCircle = t.shape === "CIRCLE";
            const clickable = !t.isOccupied && !!onTableClick;

            return (
              <Group
                key={t.id}
                x={t.x}
                y={t.y}
                onClick={clickable ? () => onTableClick(t) : undefined}
                onTap={clickable ? () => onTableClick(t) : undefined}
                onMouseEnter={(e) => {
                  if (clickable) {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = "pointer";
                  }
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = "default";
                }}
              >
                {isCircle ? (
                  <Circle
                    radius={t.width / 2}
                    fill={fill}
                    stroke={COLORS.stroke}
                    strokeWidth={2}
                  />
                ) : (
                  <Rect
                    width={t.width}
                    height={t.height}
                    fill={fill}
                    stroke={COLORS.stroke}
                    strokeWidth={2}
                    cornerRadius={6}
                    offsetX={t.width / 2}
                    offsetY={t.height / 2}
                  />
                )}
                <Text
                  text={`${t.label}\n${t.seats} seats`}
                  fontSize={12}
                  fontStyle="bold"
                  fill={COLORS.label}
                  align="center"
                  width={t.width}
                  offsetX={t.width / 2}
                  offsetY={isCircle ? 12 : t.height / 2 - 8}
                  listening={false}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}