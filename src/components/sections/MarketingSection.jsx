import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmtMoney = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export default function MarketingSection({ data, color }) {
  const chartData = data.campaigns.map(campaign => ({
    name: campaign.name.split(' ').slice(0, 2).join(' '), // Shorten names for chart
    fullName: campaign.name,
    spend: campaign.spend,
    leads: campaign.leads,
    roas: campaign.roas
  }));

  const totalLeads = data.campaigns.reduce((sum, c) => sum + c.leads, 0);
  const bestCampaign = data.campaigns.reduce((best, c) => (c.roas > best.roas ? c : best), data.campaigns[0]);

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
            <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-2">Total Ad Spend</p>
            <div className="text-3xl font-black" style={{ color }}>
              {fmtMoney(data.adSpend)}
            </div>
            <p className="text-slate-400 text-sm mt-2">This month</p>
          </div>

          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-2">Total Leads from Ads</p>
            <div className="text-3xl font-black text-cyan-400">
              {totalLeads}
            </div>
            <p className="text-slate-400 text-sm mt-2">
              Avg {totalLeads > 0 ? fmtMoney(Math.round(data.adSpend / totalLeads)) : '—'} per lead
            </p>
          </div>

          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide mb-2">Best Performing</p>
            <div className="text-3xl font-black text-purple-400">
              {bestCampaign.roas.toFixed(1)}x ROAS
            </div>
            <p className="text-slate-400 text-sm mt-2">{bestCampaign.name}</p>
          </div>
        </div>

        {/* Campaign Breakdown Chart */}
        <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 mb-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="name" tick={{ fontSize: 13, fill: '#cbd5e1' }} angle={-30} textAnchor="end" height={70} />
              <YAxis yAxisId="left" tick={{ fontSize: 13, fill: '#cbd5e1' }} tickFormatter={(v) => `$${v / 1000}k`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 13, fill: '#cbd5e1' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: `1px solid ${color}`,
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: 14
                }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                formatter={(value, name) => {
                  if (name === 'Spend ($)') return [fmtMoney(value), 'Spend'];
                  if (name === 'ROAS (x)') return [`${Number(value).toFixed(1)}x`, 'ROAS'];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 14 }} />
              <Bar yAxisId="left" dataKey="spend" fill="#FF6B6B" radius={[8, 8, 0, 0]} name="Spend ($)" />
              <Bar yAxisId="right" dataKey="leads" fill={color} radius={[8, 8, 0, 0]} name="Leads" />
              <Bar yAxisId="right" dataKey="roas" fill="#FFD93D" radius={[8, 8, 0, 0]} name="ROAS (x)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign Details Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/30">
                <th className="text-left py-3 px-4 text-slate-300 font-semibold uppercase tracking-wide text-[13px]">Campaign</th>
                <th className="text-right py-3 px-4 text-slate-300 font-semibold uppercase tracking-wide text-[13px]">Spend</th>
                <th className="text-right py-3 px-4 text-slate-300 font-semibold uppercase tracking-wide text-[13px]">Leads</th>
                <th className="text-right py-3 px-4 text-slate-300 font-semibold uppercase tracking-wide text-[13px]">CPL</th>
                <th className="text-right py-3 px-4 text-slate-300 font-semibold uppercase tracking-wide text-[13px]">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {data.campaigns.map((campaign, idx) => (
                <tr key={idx} className="border-b border-gray-700/20 hover:bg-gray-900/30 transition">
                  <td className="py-3 px-4 text-slate-200">{campaign.name}</td>
                  <td className="text-right py-3 px-4 text-slate-300">{fmtMoney(campaign.spend)}</td>
                  <td className="text-right py-3 px-4">
                    <span className="text-cyan-400 font-bold">{campaign.leads}</span>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-300">
                    {campaign.cpl > 0 ? fmtMoney(campaign.cpl) : '—'}
                  </td>
                  <td className="text-right py-3 px-4">
                    {campaign.roas > 0 ? (
                      <span className="text-green-400 font-bold">{campaign.roas.toFixed(1)}x</span>
                    ) : (
                      <span className="text-slate-500">—</span>
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
