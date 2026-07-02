import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const fmtMoney = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function LeadsPipeline({ data, color }) {
  const totalPipeline = data.pipelineBreakdown.reduce((sum, stage) => sum + stage.value, 0);
  const isTrendUp = data.trendPercent >= 0;

  return (
    <section className="group relative">
      {/* Glow effect */}
      <div
        className="absolute -inset-1 rounded-xl blur opacity-0 group-hover:opacity-30 transition duration-300"
        style={{
          backgroundImage: `linear-gradient(90deg, ${color}, transparent)`
        }}
      ></div>

      <div className="relative bg-gradient-to-br from-gray-900/50 to-gray-950/50 border border-gray-700/30 rounded-xl p-6 backdrop-blur-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold uppercase tracking-wide mb-4" style={{ color }}>
            📊 Leads & Pipeline
          </h2>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
              <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-1">New Leads This Week</p>
              <div className="text-3xl font-bold text-cyan-400 mb-2">{data.newThisWeek}</div>
              <div className="flex items-center gap-1" style={{ color: isTrendUp ? '#4ade80' : '#f87171' }}>
                {isTrendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-semibold">{isTrendUp ? '+' : ''}{data.trendPercent}% vs last week</span>
              </div>
            </div>

            <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
              <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-1">Avg Days in Pipeline</p>
              <div className="text-3xl font-bold" style={{ color }}>
                {data.avgDaysInPipeline}d
              </div>
              <p className="text-slate-400 text-sm mt-2">Sales cycle</p>
            </div>
          </div>

          {/* Pipeline Breakdown Chart */}
          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide">Pipeline by Stage</p>
              <p className="text-slate-200 text-sm font-semibold">Total: {fmtMoney(totalPipeline)}</p>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.pipelineBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="stage" tick={{ fontSize: 13, fill: '#cbd5e1' }} />
                  <YAxis tick={{ fontSize: 13, fill: '#cbd5e1' }} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: `1px solid ${color}`,
                      borderRadius: '8px',
                      color: '#f1f5f9',
                      fontSize: 14
                    }}
                    cursor={{ fill: `${color}20` }}
                    formatter={(value, name, props) => [
                      `${fmtMoney(value)} (${props.payload.count} ${props.payload.count === 1 ? 'deal' : 'deals'})`,
                      'Value'
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    fill={color}
                    radius={[8, 8, 0, 0]}
                    animationDuration={800}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-2">Win Rate</p>
            <div className="flex items-end gap-3">
              <div className="text-3xl font-black" style={{ color }}>
                {data.winRate}%
              </div>
              <div className="flex-1 h-8 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${data.winRate}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${color}80`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
