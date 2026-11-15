import { useMemo, useState } from 'react';
import { BarChart3, CalendarDays } from 'lucide-react';
import {
  buildRollingConsistencyWindow,
  type ConsistencyDayPoint,
} from '../engines/streaksEngine';

interface ConsistencyHeatmap30Props {
  activityCounts: Record<string, number>;
  dailyGoal: number;
  referenceDate?: Date;
}

export function ConsistencyHeatmap30({
  activityCounts,
  dailyGoal,
  referenceDate,
}: ConsistencyHeatmap30Props) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'line'>('heatmap');
  const [inspectedDay, setInspectedDay] = useState<ConsistencyDayPoint | null>(null);

  const summary = useMemo(
    () =>
      buildRollingConsistencyWindow(
        activityCounts,
        dailyGoal,
        30,
        referenceDate ?? new Date(),
      ),
    [activityCounts, dailyGoal, referenceDate],
  );

  const selectedDay = inspectedDay ?? summary.days[summary.days.length - 1];
  const chartMax = Math.max(dailyGoal, summary.peakDayCount, 2);

  // SVG coordinate space for 30-day line chart
  const svgWidth = 600;
  const svgHeight = 148;
  const padX = 16;
  const padTop = 18;
  const padBottom = 22;
  const plotWidth = svgWidth - padX * 2;
  const plotHeight = svgHeight - padTop - padBottom;

  const points = summary.days.map((day, idx) => {
    const x =
      summary.days.length > 1
        ? padX + (idx / (summary.days.length - 1)) * plotWidth
        : padX + plotWidth / 2;
    const y = padTop + plotHeight - (day.completedCount / chartMax) * plotHeight;
    return { x, y, day };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints =
    points.length > 0
      ? `${padX},${padTop + plotHeight} ${polylinePoints} ${padX + plotWidth},${padTop + plotHeight}`
      : '';
  const goalLineY = padTop + plotHeight - (dailyGoal / chartMax) * plotHeight;

  return (
    <section
      aria-label="30-day daily learning consistency"
      className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-[#181818] sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-neutral-800">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-white">
              30-Day Consistency
            </h2>
            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-bold text-emerald-700 tabular-nums dark:bg-[#202020] dark:text-emerald-400">
              {summary.consistencyPercent}% active
            </span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums dark:text-neutral-400">
            {summary.activeDaysCount}/30 active days · {summary.goalMetDaysCount}{' '}
            goal days · {summary.totalModulesCompleted} modules logged
          </p>
        </div>

        <div
          role="group"
          aria-label="Consistency visualization mode"
          className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-neutral-800 dark:bg-[#202020]"
        >
          <button
            type="button"
            onClick={() => setViewMode('heatmap')}
            aria-pressed={viewMode === 'heatmap'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'heatmap'
                ? 'bg-white text-slate-950 shadow-xs dark:bg-[#181818] dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Heatmap</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('line')}
            aria-pressed={viewMode === 'line'}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === 'line'
                ? 'bg-white text-slate-950 shadow-xs dark:bg-[#181818] dark:text-white'
                : 'text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Line Chart</span>
          </button>
        </div>
      </div>

      {viewMode === 'heatmap' ? (
        <div className="mt-4 space-y-3">
          <div
            className="grid grid-cols-10 gap-1.5 sm:grid-cols-15"
            role="list"
            aria-label="Last 30 days learning heatmap"
          >
            {summary.days.map((day) => {
              const tone =
                day.intensity === 3
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : day.intensity === 2
                    ? 'border-emerald-400 bg-emerald-200 text-emerald-950 dark:border-emerald-600 dark:bg-[#202020] dark:text-emerald-300'
                    : day.intensity === 1
                      ? 'border-amber-400 bg-amber-100 text-amber-950 dark:border-amber-600 dark:bg-[#202020] dark:text-amber-300'
                      : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-neutral-800 dark:bg-[#141414] dark:text-neutral-500';

              const isSelected = selectedDay?.dateKey === day.dateKey;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  role="listitem"
                  onClick={() => setInspectedDay(day)}
                  onMouseEnter={() => setInspectedDay(day)}
                  aria-label={`${day.shortDate} (${day.weekdayLabel}): ${day.completedCount} modules`}
                  className={`flex aspect-square flex-col items-center justify-center rounded-lg border font-mono text-[10px] font-bold tabular-nums transition-transform hover:scale-105 focus:outline-none ${tone} ${
                    day.isToday
                      ? 'ring-2 ring-blue-600 ring-offset-1 dark:ring-blue-500 dark:ring-offset-[#181818]'
                      : isSelected
                        ? 'ring-2 ring-slate-400 ring-offset-1 dark:ring-neutral-500 dark:ring-offset-[#181818]'
                        : ''
                  }`}
                >
                  <span>{day.dayNumber}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-40 w-full overflow-visible"
            role="img"
            aria-label={`Line chart of daily completed modules over the last 30 days. Peak ${summary.peakDayCount} modules.`}
          >
            <defs>
              <linearGradient id="consistencyAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.26" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Baseline */}
            <line
              x1={padX}
              y1={padTop + plotHeight}
              x2={padX + plotWidth}
              y2={padTop + plotHeight}
              strokeWidth="1"
              className="stroke-slate-200 dark:stroke-neutral-700"
            />

            {/* Daily goal threshold line */}
            <line
              x1={padX}
              y1={goalLineY}
              x2={padX + plotWidth}
              y2={goalLineY}
              stroke="#10B981"
              strokeWidth="1.25"
              strokeDasharray="4 4"
            />
            <text
              x={padX + plotWidth}
              y={Math.max(12, goalLineY - 4)}
              textAnchor="end"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="600"
              className="fill-emerald-600 dark:fill-emerald-400"
            >
              Goal ({dailyGoal}/day)
            </text>

            {/* Area fill & trend line */}
            {areaPoints && (
              <polygon points={areaPoints} fill="url(#consistencyAreaGrad)" />
            )}
            {polylinePoints && (
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />
            )}

            {/* Interactive data points */}
            {points.map(({ x, y, day }) => {
              const isSelected = selectedDay?.dateKey === day.dateKey;
              return (
                <circle
                  key={day.dateKey}
                  cx={x}
                  cy={y}
                  r={isSelected ? 5 : day.completedCount > 0 ? 3.5 : 2.25}
                  strokeWidth="1.5"
                  className={`cursor-pointer stroke-white dark:stroke-[#181818] ${
                    day.isGoalMet
                      ? 'fill-emerald-500'
                      : day.completedCount > 0
                        ? 'fill-blue-600 dark:fill-blue-400'
                        : 'fill-slate-300 dark:fill-neutral-600'
                  }`}
                  onMouseEnter={() => setInspectedDay(day)}
                  onClick={() => setInspectedDay(day)}
                >
                  <title>
                    {day.shortDate}: {day.completedCount} module
                    {day.completedCount === 1 ? '' : 's'}
                  </title>
                </circle>
              );
            })}

            {/* Start / Mid / Today x-axis labels */}
            {summary.days.length >= 30 && (
              <>
                <text
                  x={padX}
                  y={svgHeight - 4}
                  textAnchor="start"
                  fontSize="10"
                  fontFamily="monospace"
                  className="fill-slate-500 dark:fill-neutral-400"
                >
                  {summary.days[0].shortDate}
                </text>
                <text
                  x={padX + plotWidth / 2}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  className="fill-slate-500 dark:fill-neutral-400"
                >
                  {summary.days[14].shortDate}
                </text>
                <text
                  x={padX + plotWidth}
                  y={svgHeight - 4}
                  textAnchor="end"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="700"
                  className="fill-blue-600 dark:fill-blue-400"
                >
                  Today
                </text>
              </>
            )}
          </svg>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-neutral-800 dark:text-neutral-400">
        {selectedDay && (
          <div className="font-mono text-xs text-slate-700 tabular-nums dark:text-neutral-300">
            <span className="font-bold text-slate-950 dark:text-white">
              {selectedDay.shortDate} ({selectedDay.weekdayLabel})
              {selectedDay.isToday ? ' · Today' : ''}
            </span>
            {' · '}
            <span>
              {selectedDay.completedCount} module
              {selectedDay.completedCount === 1 ? '' : 's'}
            </span>
            {selectedDay.isGoalMet && (
              <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-[#202020] dark:text-emerald-400">
                Goal Met
              </span>
            )}
          </div>
        )}

        <span className="font-mono text-[11px] text-slate-400 dark:text-neutral-500">
          {summary.days[0]?.shortDate} – {summary.days[summary.days.length - 1]?.shortDate}
        </span>
      </div>
    </section>
  );
}
