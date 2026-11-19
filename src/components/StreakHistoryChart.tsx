import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Flame } from 'lucide-react';
import { getTodayDateKey } from '../constants';
import { CoinTransaction } from '../types';
import { getLast7DaysDateKeysSAST } from '../utils/localState';

interface StreakHistoryChartProps {
  streakActivityDates?: string[];
  transactions?: CoinTransaction[];
}

interface DayDataPoint {
  dateKey: string;
  weekdayLabel: string;
  shortDate: string;
  isToday: boolean;
  checkedIn: boolean;
  coinsEarned: number;
}

export const StreakHistoryChart: React.FC<StreakHistoryChartProps> = ({
  streakActivityDates = [],
  transactions = [],
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredDay, setHoveredDay] = useState<DayDataPoint | null>(null);

  const data: DayDataPoint[] = useMemo(() => {
    const days = getLast7DaysDateKeysSAST();
    const activeSet = new Set(streakActivityDates);

    const coinsByDate = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type !== 'earn' || tx.amount <= 0) return;
      const ms = tx.createdAt?.toDate
        ? tx.createdAt.toDate().getTime()
        : tx.createdAtMs || Date.now();
      const key = getTodayDateKey(new Date(ms));
      coinsByDate.set(key, (coinsByDate.get(key) || 0) + tx.amount);
      if (tx.category === 'streak' || tx.category === 'daily-gift') {
        activeSet.add(key);
      }
    });

    return days.map((d) => {
      const coinsEarned = coinsByDate.get(d.dateKey) || 0;
      const checkedIn = activeSet.has(d.dateKey) || coinsEarned > 0;
      return {
        ...d,
        checkedIn,
        coinsEarned,
      };
    });
  }, [streakActivityDates, transactions]);

  const activeCount = useMemo(
    () => data.filter((d) => d.checkedIn).length,
    [data]
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 560;
    const height = 185;
    const margin = { top: 22, right: 16, bottom: 38, left: 38 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    const barGrad = defs
      .append('linearGradient')
      .attr('id', 'streak-bar-gold')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    barGrad.append('stop').attr('offset', '0%').attr('stop-color', '#FCE7A2');
    barGrad.append('stop').attr('offset', '55%').attr('stop-color', '#D4AF37');
    barGrad.append('stop').attr('offset', '100%').attr('stop-color', '#8F6C18');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxCoins = Math.max(
      200,
      d3.max(data, (d) => (d.checkedIn ? Math.max(d.coinsEarned, 100) : 0)) || 200
    );

    const xScale = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.dateKey))
      .range([0, innerWidth])
      .padding(0.32);

    const yScale = d3.scaleLinear().domain([0, maxCoins]).nice().range([innerHeight, 0]);

    // Subtle horizontal gridlines
    const yTicks = yScale.ticks(3);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (t) => yScale(t))
      .attr('y2', (t) => yScale(t))
      .attr('stroke', 'rgba(255,255,255,0.06)')
      .attr('stroke-dasharray', '3,3');

    // Y axis labels
    g.selectAll('.y-label')
      .data(yTicks)
      .enter()
      .append('text')
      .attr('x', -8)
      .attr('y', (t) => yScale(t) + 3.5)
      .attr('text-anchor', 'end')
      .attr('fill', '#8D867A')
      .attr('font-size', '10px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text((t) => (t === 0 ? '0' : `${t}`));

    // Baseline
    g.append('line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', innerHeight)
      .attr('y2', innerHeight)
      .attr('stroke', 'rgba(212,175,55,0.22)');

    // Bars
    const barGroups = g
      .selectAll('.day-bar')
      .data(data)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${xScale(d.dateKey) || 0}, 0)`)
      .style('cursor', 'pointer')
      .on('mouseenter', (_, d) => setHoveredDay(d))
      .on('mouseleave', () => setHoveredDay(null))
      .on('click', (_, d) => setHoveredDay(d));

    const bw = xScale.bandwidth();

    // Inactive background slot for missed/pending days
    barGroups
      .append('rect')
      .attr('x', 0)
      .attr('y', innerHeight - 14)
      .attr('width', bw)
      .attr('height', 14)
      .attr('rx', 6)
      .attr('fill', (d) => (d.checkedIn ? 'transparent' : 'rgba(255,255,255,0.04)'))
      .attr('stroke', (d) =>
        d.checkedIn
          ? 'none'
          : d.isToday
            ? 'rgba(212,175,55,0.45)'
            : 'rgba(255,255,255,0.08)'
      )
      .attr('stroke-dasharray', (d) => (d.checkedIn ? 'none' : '3,3'));

    // Active gold bars
    barGroups
      .filter((d) => d.checkedIn)
      .append('rect')
      .attr('x', 0)
      .attr('y', (d) => yScale(Math.max(d.coinsEarned, 100)))
      .attr('width', bw)
      .attr('height', (d) => Math.max(8, innerHeight - yScale(Math.max(d.coinsEarned, 100))))
      .attr('rx', 7)
      .attr('fill', 'url(#streak-bar-gold)')
      .attr('stroke', '#FFF1BD')
      .attr('stroke-opacity', 0.45)
      .attr('stroke-width', 1);

    // Check-in status dot above bar
    barGroups
      .append('circle')
      .attr('cx', bw / 2)
      .attr('cy', (d) =>
        d.checkedIn ? yScale(Math.max(d.coinsEarned, 100)) - 8 : innerHeight - 22
      )
      .attr('r', 3.5)
      .attr('fill', (d) => (d.checkedIn ? '#FCE7A2' : '#4A463E'));

    // X-axis weekday labels
    barGroups
      .append('text')
      .attr('x', bw / 2)
      .attr('y', innerHeight + 17)
      .attr('text-anchor', 'middle')
      .attr('fill', (d) => (d.isToday ? '#FCE7A2' : '#C4BDB0'))
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d.isToday ? '700' : '500'))
      .text((d) => d.weekdayLabel);

    barGroups
      .append('text')
      .attr('x', bw / 2)
      .attr('y', innerHeight + 30)
      .attr('text-anchor', 'middle')
      .attr('fill', '#7A746A')
      .attr('font-size', '9.5px')
      .attr('font-family', 'JetBrains Mono, monospace')
      .text((d) => d.shortDate);
  }, [data]);

  const focusedDay = hoveredDay || data[data.length - 1];

  return (
    <section className="obsidian-card rounded-2xl p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]">
              Streak History (Last 7 Days)
            </h2>
          </div>
          <p className="text-xs text-[#A69F91]">
            Daily check-in consistency and coins collected over the past week.
          </p>
        </div>

        <div className="font-mono-num text-xs font-semibold text-[#FCE7A2]">
          {activeCount} / 7 Active Days
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox="0 0 560 185"
          className="w-full min-w-[340px] h-auto block"
          role="img"
          aria-label={`7-day streak history chart showing ${activeCount} of 7 active check-in days`}
        />
      </div>

      {focusedDay && (
        <div className="rounded-xl bg-[#09090D] border border-white/[0.07] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                focusedDay.checkedIn ? 'bg-[#FCE7A2]' : 'bg-[#5A544A]'
              }`}
            />
            <span className="font-semibold text-[#F6F2E9]">
              {focusedDay.weekdayLabel} ({focusedDay.shortDate})
            </span>
            <span className="text-[#8D867A]">
              {focusedDay.checkedIn
                ? 'Checked In'
                : focusedDay.isToday
                  ? 'Pending Check-In'
                  : 'No Check-In'}
            </span>
          </div>
          <span className="font-mono-num font-bold text-[#E8C96D]">
            {focusedDay.coinsEarned > 0
              ? `+${focusedDay.coinsEarned.toLocaleString()} Coins`
              : focusedDay.checkedIn
                ? 'Active'
                : '0 Coins'}
          </span>
        </div>
      )}
    </section>
  );
};
