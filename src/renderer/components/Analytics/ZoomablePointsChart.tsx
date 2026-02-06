/* @refresh reset */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';

export type PointsDatum = {
  date: string;
  'Task Points': number;
  'Passive Points': number;
};

type ZoomablePointsChartProps = {
  data: PointsDatum[];
  heightClassName?: string;
};

const monoTickStyle = {
  fontFamily:
    "SF Mono, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 9,
  fontWeight: 700,
} as const;

function formatPoints(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

type RangeKey = 'all' | '30' | '7';

type TotalDatum = {
  date: string;
  delta: number;
  total: number;
};

export default function ZoomablePointsChart({
  data,
  heightClassName = 'h-[420px]',
}: ZoomablePointsChartProps) {
  const { isDark } = useTheme();

  const [range, setRange] = useState<RangeKey>('all');
  const [view, setView] = useState<TotalDatum[]>([]);
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null);
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null);

  const fullSeries = useMemo<TotalDatum[]>(() => {
    let running = 0;
    return data.map((d) => {
      const delta = (d['Task Points'] || 0) + (d['Passive Points'] || 0);
      running += delta;
      return { date: d.date, delta, total: running };
    });
  }, [data]);

  const baseSeries = useMemo<TotalDatum[]>(() => {
    if (range === '7') return fullSeries.slice(-7);
    if (range === '30') return fullSeries.slice(-30);
    return fullSeries;
  }, [fullSeries, range]);

  useEffect(() => {
    setView(baseSeries);
    setRefAreaLeft(null);
    setRefAreaRight(null);
  }, [baseSeries]);

  const colors = useMemo(() => {
    const seriesColor = isDark ? '#ff9500' : '#007aff';

    return {
      axis: isDark ? '#2a2a2a' : '#e5e7eb',
      grid: isDark ? '#1a1a1a' : '#e5e7eb',
      tick: isDark ? '#a0a0a0' : '#6b7280',
      tooltipBg: isDark ? '#1a1a1a' : '#111827',
      tooltipBorder: isDark ? '#2a2a2a' : '#111827',
      tooltipText: '#ffffff',
      selectionStroke: seriesColor,
      selectionFill: isDark
        ? 'rgba(255, 255, 255, 0.10)'
        : 'rgba(17, 24, 39, 0.08)',
      series: seriesColor,
    } as const;
  }, [isDark]);

  const zoom = () => {
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const leftIndex = view.findIndex((d) => d.date === refAreaLeft);
    const rightIndex = view.findIndex((d) => d.date === refAreaRight);

    if (leftIndex === -1 || rightIndex === -1) {
      setRefAreaLeft(null);
      setRefAreaRight(null);
      return;
    }

    const from = Math.min(leftIndex, rightIndex);
    const to = Math.max(leftIndex, rightIndex);

    setView(view.slice(from, to + 1));
    setRefAreaLeft(null);
    setRefAreaRight(null);
  };

  const TooltipContent = (props: any) => {
    const { active, payload, label } = props;
    if (!active || !payload?.length) return null;

    const total = payload?.[0]?.value;
    const delta = payload?.[0]?.payload?.delta;

    return (
      <div
        className="rounded border shadow-industrial-sm px-3 py-2"
        style={{
          background: colors.tooltipBg,
          borderColor: colors.tooltipBorder,
          color: colors.tooltipText,
        }}
      >
        <div className="text-[9px] font-mono font-bold tracking-industrial-wide uppercase mb-2 opacity-90">
          {String(label).toUpperCase()}
        </div>
        <div className="flex items-center justify-between gap-6 text-[11px] font-mono">
          <span className="opacity-80">DAILY</span>
          <span className="font-semibold">{formatPoints(Number(delta) || 0)}</span>
        </div>
        <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-6 text-[11px] font-mono">
          <span className="opacity-80">TOTAL</span>
          <span className="font-semibold">
            {formatPoints(Number(total) || 0)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-[9px] uppercase tracking-industrial-wide font-mono font-bold ${
            isDark ? 'text-industrial-white-tertiary' : 'text-gray-500'
          }`}
        >
          Drag to zoom
        </p>
        <div className="flex items-center gap-2">
          <div
            className={`rounded-lg p-1 ${
              isDark
                ? 'bg-industrial-black-tertiary border border-industrial-border-subtle'
                : 'bg-gray-100 border border-gray-300'
            }`}
          >
            <div className="flex gap-1">
              {(
                [
                  { key: 'all', label: 'All time' },
                  { key: '30', label: 'Last 30 days' },
                  { key: '7', label: 'Last 7 days' },
                ] as const
              ).map((opt) => (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => {
                    // Clicking a range always resets the zoom for that range.
                    if (opt.key !== range) setRange(opt.key);
                    const nextBase =
                      opt.key === '7'
                        ? fullSeries.slice(-7)
                        : opt.key === '30'
                          ? fullSeries.slice(-30)
                          : fullSeries;
                    setView(nextBase);
                    setRefAreaLeft(null);
                    setRefAreaRight(null);
                  }}
                  className={`py-1.5 px-3 text-[9px] uppercase tracking-industrial-wide font-mono font-bold rounded-md transition-all ${
                    range === opt.key
                      ? isDark
                        ? 'bg-industrial-black-primary text-white border border-industrial-border'
                        : 'bg-white text-gray-900 border border-gray-300'
                      : isDark
                        ? 'text-industrial-white-tertiary hover:text-industrial-white-secondary border border-transparent'
                        : 'text-gray-600 hover:text-gray-900 border border-transparent'
                  }`}
                  aria-current={range === opt.key ? 'page' : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full ${heightClassName} select-none`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={view}
            margin={{ top: 10, right: 14, left: 6, bottom: 6 }}
            onMouseDown={(e: any) => {
              if (e?.activeLabel) setRefAreaLeft(String(e.activeLabel));
            }}
            onMouseMove={(e: any) => {
              if (refAreaLeft && e?.activeLabel)
                setRefAreaRight(String(e.activeLabel));
            }}
            onMouseUp={zoom}
            onMouseLeave={() => {
              if (refAreaLeft) {
                setRefAreaLeft(null);
                setRefAreaRight(null);
              }
            }}
          >
            <defs>
              <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={colors.series}
                  stopOpacity={isDark ? 0.22 : 0.09}
                />
                <stop offset="95%" stopColor={colors.series} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              stroke={colors.grid}
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="date"
              axisLine={{ stroke: colors.axis }}
              tickLine={false}
              minTickGap={16}
              tick={{ ...monoTickStyle, fill: colors.tick }}
              tickFormatter={(v) => String(v).toUpperCase()}
            />

            <YAxis
              width={48}
              axisLine={{ stroke: colors.axis }}
              tickLine={false}
              tick={{ ...monoTickStyle, fill: colors.tick }}
              tickFormatter={(v) => formatPoints(Number(v))}
              domain={[0, 'dataMax + 10']}
            />

            <Tooltip
              content={<TooltipContent />}
              cursor={{
                stroke: colors.selectionStroke,
                strokeDasharray: '3 3',
                strokeOpacity: 0.45,
              }}
            />

            {refAreaLeft && refAreaRight ? (
              <ReferenceArea
                x1={refAreaLeft}
                x2={refAreaRight}
                stroke={colors.selectionStroke}
                strokeOpacity={0.35}
                fill={colors.selectionFill}
                fillOpacity={0.3}
              />
            ) : null}

            <Area
              type="natural"
              dataKey="total"
              stroke={colors.series}
              strokeWidth={2}
              fill="url(#totalGradient)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0, fill: colors.series }}
              isAnimationActive
              animationDuration={450}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
