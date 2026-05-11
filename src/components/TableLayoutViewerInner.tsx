"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Text, Group } from "react-konva";
import type { TableWithStatus } from "@/lib/types";

type Props = {
  tables: TableWithStatus[];
  onTableClick?: (table: TableWithStatus) => void;
  allowClickOccupied?: boolean;
};

// Logical canvas size — koordinat meja disimpan dalam sistem ini
const LOGICAL_W = 800;
const LOGICAL_H = 500;

const COLORS = {
  free: "#7A9270",
  freeStroke: "#5F7556",
  occupied: "#C76449",
  occupiedStroke: "#A85339",
  label: "#FFFFFF",
};

export default function TableLayoutViewerInner({
  tables,
  onTableClick,
  allowClickOccupied = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(LOGICAL_W);

  // Observe container size dan adjust canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        setContainerWidth(Math.min(w, LOGICAL_W));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scale factor: kalau container lebih kecil dari logical, scale down
  const scale = containerWidth / LOGICAL_W;
  const renderWidth = containerWidth;
  const renderHeight = LOGICAL_H * scale;

  return (
    <div
      ref={containerRef}
      className="border border-border-warm rounded-lg overflow-hidden bg-cream-light shadow-sm w-full"
    >
      <Stage
        width={renderWidth}
        height={renderHeight}
        scaleX={scale}
        scaleY={scale}
      >
        <Layer>
          {tables.map((t) => {
            const fill = t.isOccupied ? COLORS.occupied : COLORS.free;
            const stroke = t.isOccupied
              ? COLORS.occupiedStroke
              : COLORS.freeStroke;
            const isCircle = t.shape === "CIRCLE";
            const clickable =
              !!onTableClick && (!t.isOccupied || allowClickOccupied);

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
                    stroke={stroke}
                    strokeWidth={2}
                    shadowColor="rgba(0,0,0,0.1)"
                    shadowBlur={4}
                    shadowOffsetY={2}
                  />
                ) : (
                  <Rect
                    width={t.width}
                    height={t.height}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={2}
                    cornerRadius={8}
                    offsetX={t.width / 2}
                    offsetY={t.height / 2}
                    shadowColor="rgba(0,0,0,0.1)"
                    shadowBlur={4}
                    shadowOffsetY={2}
                  />
                )}
                <Text
                  text={`${t.label}\n${t.seats} seats`}
                  fontSize={12}
                  fontStyle="bold"
                  fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
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