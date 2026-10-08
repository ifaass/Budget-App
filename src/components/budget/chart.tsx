import { useEffect, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { t, type StringKey } from "@/lib/budget/i18n";
import type { Lang } from "@/lib/budget/types";

export type Slice = {
  id: string;
  name: string;
  cents: number;
  money: string;
  pct: number;
  fill: string;
};

function sliceFill(index: number, total: number): string {
  const span = total <= 1 ? 0 : index / (total - 1);
  const light = 22 + span * 48;
  return `hsl(206 28% ${light}%)`;
}

export function withShares(
  rows: { id: string; name: string; cents: number; money: string }[],
): Slice[] {
  const total = rows.reduce((sum, row) => sum + row.cents, 0);
  const raw = rows.map((row) => (total > 0 ? (row.cents / total) * 100 : 0));
  const floors = raw.map((value) => Math.floor(value));
  let left = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac);
  for (let i = 0; i < order.length && left > 0; i += 1) {
    floors[order[i].index] += 1;
    left -= 1;
  }
  return rows.map((row, index) => ({
    ...row,
    pct: total > 0 ? floors[index] : 0,
    fill: sliceFill(index, rows.length),
  }));
}

function Tip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: Slice }>;
}) {
  if (!active || !payload?.length) return null;
  const slice = payload[0].payload;
  return (
    <div className="rounded-control border border-line bg-surface px-3 py-2 text-sm shadow-panel">
      <p className="font-semibold">{slice.name}</p>
      <p className="nums text-muted">
        {slice.money} · {slice.pct}%
      </p>
    </div>
  );
}

export function BreakdownChart({
  slices,
  emptyKey,
  lang,
  label,
}: {
  slices: Slice[];
  emptyKey: StringKey;
  lang: Lang;
  label: string;
}) {
  const [ready, setReady] = useState(false);
  const [motion, setMotion] = useState(true);

  useEffect(() => {
    setReady(true);
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (slices.length === 0) {
    return <p className="text-sm text-muted">{t(lang, emptyKey)}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center">
      <div className="mx-auto h-52 w-full max-w-56" role="img" aria-label={label}>
        {ready ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="cents"
                nameKey="name"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={slices.length > 1 ? 1.5 : 0}
                stroke="var(--color-surface)"
                strokeWidth={2}
                isAnimationActive={motion}
              >
                {slices.map((slice) => (
                  <Cell key={slice.id} fill={slice.fill} />
                ))}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : null}
      </div>
      <ul className="max-h-72 divide-y divide-line overflow-y-auto">
        {slices.map((slice) => (
          <li key={slice.id} className="flex items-center gap-3 py-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ background: slice.fill }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 leading-snug">{slice.name}</span>
            <span className="shrink-0 text-right">
              <span className="nums block font-semibold">{slice.money}</span>
              <span className="nums block text-sm text-muted">{slice.pct}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
