import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
              <p className="text-gray-500 text-xs font-mono uppercase mb-1">New Leads This Week</p>
              <div className="text-2xl font-bold text-cyan-400 mb-2">{data.newThisWeek}</div>
              <div className="flex items-center gap-1" style={{ color: isTrendUp ? '#4ade80' : '#f87171' }}>
                {isTrendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-mono">{isTrendUp ? '+' : ''}{data.trendPercent}% vs last week</span>
              </div>
            </div>

            <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
              <p className="text-gray-500 text-xs font-mono uppercase mb-1">Avg Days in Pipeline</p>
              <div className="text-2xl font-bold" style={{ color }}>
                {data.avgDaysInPipeline}d
              </div>
              <p className="text-gray-600 text-xs mt-2">Sales cycle</p>
            </div>
          </div>

          {/* Pipeline Breakdown Chart */}
          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 mb-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pipelineBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                <XAxis dataKey="stage" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: `1px solid ${color}`,
                    borderRadius: '8px'
                  }}
                  cursor={{ fill: `${color}20` }}
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

          {/* Win Rate */}
          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-gray-500 text-xs font-mono uppercase mb-2">Win Rate</p>
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
