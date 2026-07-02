import React from 'react';
import { Zap } from 'lucide-react';

export default function BusinessHealthSection({ data, color }) {
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
        <h2 className="text-xl font-bold uppercase tracking-wide mb-6" style={{ color }}>
          ⚡ Business Health
        </h2>

        {/* Next Milestone */}
        <div className="mb-6 bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4" style={{ color }} />
            <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide">Next Milestone</p>
          </div>
          <p className="text-lg font-bold text-white">{data.nextMilestone}</p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {data.keyMetrics.map((metric, idx) => (
            <MetricItem key={idx} metric={metric} color={color} />
          ))}
        </div>

        {/* Status Indicator */}
        <div className="mt-6 bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 flex items-center gap-3">
          <div
            className="w-4 h-4 rounded-full animate-pulse flex-shrink-0"
            style={{
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}`
            }}
          ></div>
          <div>
            <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide">Status</p>
            <p className="text-green-400 text-sm font-medium">Demo metrics — connect live APIs to track in real time</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricItem({ metric, color }) {
  return (
    <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 hover:border-purple-500/50 transition group">
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide">{metric.label}</p>
        <span className="text-lg">{metric.icon}</span>
      </div>
      <div className="text-2xl font-black" style={{ color }}>
        {metric.value}
      </div>
    </div>
  );
}
