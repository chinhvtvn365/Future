"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  LineSeries,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type CandlestickData,
} from "lightweight-charts";

type Point = { time: number; value: number }; // time ms
type Bar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}; // time ms

export default function TwoCharts({
  titleLine,
  titleCandle,
  linePoints,
  candleBars,
}: {
  titleLine: string;
  titleCandle: string;
  linePoints: Point[];
  candleBars: Bar[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <LineChart title={titleLine} points={linePoints} />
      <CandleChart title={titleCandle} bars={candleBars} />
    </div>
  );
}

function LineChart({ title, points }: { title: string; points: Point[] }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!elRef.current) return;

    const chart = createChart(elRef.current, {
      height: 260,
      layout: {
        background: { type: "solid", color: "transparent" },
        textColor: "#111",
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    });

    const series = chart.addSeries(LineSeries, {});
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () =>
      chart.applyOptions({ width: elRef.current?.clientWidth || 600 });
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);

  // ✅ Realtime: update từng điểm (tránh setData duplicate time)
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || points.length === 0) return;

    // chỉ cập nhật phần mới: lấy điểm cuối
    const p = points[points.length - 1];
    const t = Math.floor(p.time / 1000); // unix seconds
    const lastT = lastTimeRef.current;

    // lightweight-charts yêu cầu time tăng hoặc bằng (bằng thì update same bar OK với update)
    series.update({ time: t as any, value: p.value } as LineData);
    lastTimeRef.current = t;

    // fitContent nhẹ nhàng (không cần gọi liên tục, nhưng gọi cũng ổn)
    chartRef.current?.timeScale().fitContent();
  }, [points]);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div ref={elRef} className="w-full" />
    </div>
  );
}

function CandleChart({ title, bars }: { title: string; bars: Bar[] }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!elRef.current) return;

    const chart = createChart(elRef.current, {
      height: 260,
      layout: {
        background: { type: "solid", color: "transparent" },
        textColor: "#111",
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    });

    const series = chart.addSeries(CandlestickSeries, {});
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () =>
      chart.applyOptions({ width: elRef.current?.clientWidth || 600 });
    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);

  // ✅ Realtime candle: update bar cuối
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || bars.length === 0) return;

    const b = bars[bars.length - 1];
    const t = Math.floor(b.time / 1000);
    series.update({
      time: t as any,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    } as CandlestickData);

    lastTimeRef.current = t;
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div ref={elRef} className="w-full" />
    </div>
  );
}
