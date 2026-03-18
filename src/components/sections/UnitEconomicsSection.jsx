import React from 'react';

export default function UnitEconomicsSection({ data, color }) {
  const metrics = [
    {
      label: 'CAC',
      value: `$${data.cac}`,
      description: 'Cost per customer',
      icon: '💵'
    },
    {
      label: 'LTV',
      value: `$${data.ltv.toLocaleString()}`,
      description: 'Lifetime value',
      icon: '📈'
    },
    {
      label: 'Payback',
      value: `${data.paybackPeriod}mo`,
      description: 'Months to ROI',
      icon: '⏱️'
    },
    {
      label: 'LTV:CAC',
      value: `${data.ltv_cac_ratio}:1`,
      description: 'Efficiency ratio',
      icon: '⚡'
    }
  ];

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
          📊 Unit Economics
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {metrics.map((metric, idx) => (
            <MetricCard key={idx} metric={metric} color={color} />
          ))}
        </div>

        {/* Key Insight */}
        <div className="mt-6 bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
          <p className="text-gray-500 text-xs font-mono uppercase mb-2">Health Check</p>
          <div className="flex items-center gap-2">
            {data.ltv_cac_ratio > 20 ? (
              <>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-green-400 font-mono text-sm">
                  Excellent LTV:CAC ratio ({data.ltv_cac_ratio}:1) — highly profitable acquisition model
                </p>
              </>
            ) : (
              <>
                <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <p className="text-yellow-400 font-mono text-sm">
                  Monitor LTV:CAC ratio ({data.ltv_cac_ratio}:1) — aim for 3:1 or higher
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ metric, color }) {
  return (
    <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 hover:border-purple-500/50 transition group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-gray-500 text-xs font-mono uppercase">{metric.label}</p>
        <span className="text-2xl">{metric.icon}</span>
      </div>
      <div className="text-2xl font-black mb-1" style={{ color }}>
        {metric.value}
      </div>
      <p className="text-gray-600 text-xs">{metric.description}</p>
    </div>
  );
}
