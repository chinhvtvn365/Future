"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type CandlestickData,
} from "lightweight-charts";

type Point = { time: number; value: number }; // ms
type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}; // ms

export default function TwoChartsPro({
  titleLeft,
  titleRight,
  linePoints,
  candleBars,
}: {
  titleLeft: string;
  titleRight: string;
  linePoints: Point[];
  candleBars: Bar[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LineChartPro title={titleLeft} points={linePoints} />
      <CandleChartPro title={titleRight} bars={candleBars} />
    </div>
  );
}

function baseChart(el: HTMLDivElement) {
  return createChart(el, {
    height: 520,
    layout: {
      background: { type: "solid", color: "transparent" },
      textColor: "#e5e7eb",
    },
    rightPriceScale: { borderVisible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: true,
    },
    grid: {
      vertLines: { visible: true, color: "rgba(255,255,255,0.05)" },
      horzLines: { visible: true, color: "rgba(255,255,255,0.05)" },
    },
    crosshair: { mode: 1 },
  });
}

function LineChartPro({ title, points }: { title: string; points: Point[] }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo<LineData[]>(() => {
    // ensure asc by time (seconds), unique by second
    const map = new Map<number, number>();
    for (const p of points) map.set(Math.floor(p.time / 1000), p.value);
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, v]) => ({ time: t as any, value: v }));
  }, [points]);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = baseChart(elRef.current);
    const series = chart.addSeries(LineSeries, {
      lineWidth: 2,
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // tooltip
    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !param?.time) return;

      const v = param.seriesData.get(series) as any;
      if (!v?.value) return;

      tooltip.style.display = "block";
      tooltip.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;">Line</div>
        <div>Price: <b>${Number(v.value).toFixed(4)}</b></div>
      `;
    });

    const resize = () =>
      chart.applyOptions({ width: elRef.current?.clientWidth || 600 });
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // seed history + keep updated (setData for history)
  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    if (data.length) s.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div ref={elRef} className="w-full" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute right-6 top-14 hidden rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100"
      />
    </div>
  );
}

function CandleChartPro({ title, bars }: { title: string; bars: Bar[] }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo<CandlestickData[]>(() => {
    // unique by second, asc ordered
    const map = new Map<number, Bar>();
    for (const b of bars) map.set(Math.floor(b.time / 1000), b);
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([t, b]) => ({
        time: t as any,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
  }, [bars]);

  useEffect(() => {
    if (!elRef.current) return;
    const chart = baseChart(elRef.current);
    const series = chart.addSeries(CandlestickSeries, {
      priceLineVisible: true,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      if (!tooltip || !param?.time) return;
      const v = param.seriesData.get(series) as any;
      if (!v?.open) return;

      tooltip.style.display = "block";
      tooltip.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;">Candle</div>
        <div>O: <b>${Number(v.open).toFixed(4)}</b></div>
        <div>H: <b>${Number(v.high).toFixed(4)}</b></div>
        <div>L: <b>${Number(v.low).toFixed(4)}</b></div>
        <div>C: <b>${Number(v.close).toFixed(4)}</b></div>
      `;
    });

    const resize = () =>
      chart.applyOptions({ width: elRef.current?.clientWidth || 600 });
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const s = seriesRef.current;
    if (!s) return;
    if (data.length) s.setData(data);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div ref={elRef} className="w-full" />
      <div
        ref={tooltipRef}
        className="pointer-events-none absolute right-6 top-14 hidden rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100"
      />
    </div>
  );
}
