import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function MarketingSection({ data, color }) {
  const chartData = data.campaigns.map(campaign => ({
    name: campaign.name.split(' ').slice(0, 2).join(' '), // Shorten names for chart
    spend: campaign.spend,
    leads: campaign.leads,
    roas: campaign.roas.toFixed(1)
  }));

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
          📣 Marketing & Ad Performance
        </h2>

        {/* Total Ad Spend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-gray-500 text-xs font-mono uppercase mb-2">Total Ad Spend</p>
            <div className="text-3xl font-black" style={{ color }}>
              ${(data.adSpend / 1000).toFixed(1)}k
            </div>
            <p className="text-gray-600 text-xs mt-2">This month</p>
          </div>

          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-gray-500 text-xs font-mono uppercase mb-2">Total Leads from Ads</p>
            <div className="text-3xl font-black text-cyan-400">
              {data.campaigns.reduce((sum, c) => sum + c.leads, 0)}
            </div>
            <p className="text-gray-600 text-xs mt-2">Generated leads</p>
          </div>

          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-gray-500 text-xs font-mono uppercase mb-2">Best Performing</p>
            <div className="text-2xl font-black text-purple-400">
              {Math.max(...data.campaigns.map(c => c.roas)).toFixed(1)}x ROAS
            </div>
            <p className="text-gray-600 text-xs mt-2">Highest ROI campaign</p>
          </div>
        </div>

        {/* Campaign Breakdown Chart */}
        <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 mb-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: `1px solid ${color}`,
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="spend" fill="#FF6B6B" radius={[8, 8, 0, 0]} name="Spend ($)" />
              <Bar yAxisId="left" dataKey="leads" fill={color} radius={[8, 8, 0, 0]} name="Leads" />
              <Bar yAxisId="right" dataKey="roas" fill="#FFD93D" radius={[8, 8, 0, 0]} name="ROAS (x)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/30">
                <th className="text-left py-3 px-4 text-gray-500 font-mono uppercase text-xs">Campaign</th>
                <th className="text-right py-3 px-4 text-gray-500 font-mono uppercase text-xs">Spend</th>
                <th className="text-right py-3 px-4 text-gray-500 font-mono uppercase text-xs">Leads</th>
                <th className="text-right py-3 px-4 text-gray-500 font-mono uppercase text-xs">CPL</th>
                <th className="text-right py-3 px-4 text-gray-500 font-mono uppercase text-xs">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign, idx) => (
                <tr key={idx} className="border-b border-gray-700/20 hover:bg-gray-900/30 transition">
                  <td className="py-3 px-4 text-gray-300">{campaign.name}</td>
                  <td className="text-right py-3 px-4 text-gray-400">${(campaign.spend / 1000).toFixed(2)}k</td>
                  <td className="text-right py-3 px-4">
                    <span className="text-cyan-400 font-bold">{campaign.leads}</span>
                  </td>
                  <td className="text-right py-3 px-4 text-gray-400">
                    {campaign.cpl > 0 ? `$${campaign.cpl}` : '—'}
                  </td>
                  <td className="text-right py-3 px-4">
                    {campaign.roas > 0 ? (
                      <span className="text-green-400 font-bold">{campaign.roas.toFixed(1)}x</span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
