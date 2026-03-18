import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Zap, DollarSign, Users, Target, Flame } from 'lucide-react';
import { businessesMetadata, mockData } from '../data/mockData';
import BusinessSelector from './BusinessSelector';
import LeadsPipeline from './sections/LeadsPipeline';
import AccountingSection from './sections/AccountingSection';
import UnitEconomicsSection from './sections/UnitEconomicsSection';
import MarketingSection from './sections/MarketingSection';
import BusinessHealthSection from './sections/BusinessHealthSection';

export default function BossManDashboard() {
  const [activeBusiness, setActiveBusiness] = useState('solar');
  const [animatedMetrics, setAnimatedMetrics] = useState({});

  const currentBusiness = mockData[activeBusiness];
  const businessMeta = businessesMetadata[activeBusiness];

  // Animate metric changes when business switches
  useEffect(() => {
    setAnimatedMetrics({
      newLeads: currentBusiness.leads.newThisWeek,
      pipeline: currentBusiness.leads.pipelineValue,
      revenue: currentBusiness.accounting.revenueMTD
    });
  }, [activeBusiness, currentBusiness]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans overflow-x-hidden">
      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-950 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-semibold text-slate-50 tracking-tight">
                  BOSS MAN
                </h1>
                <p className="text-slate-400 text-sm mt-1">Operations Dashboard</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-emerald-500 text-xs font-medium">Live</span>
                </div>
              </div>
            </div>
            <div className="mt-6">
              {/* Business Selector */}
              <BusinessSelector
                businesses={businessesMetadata}
                active={activeBusiness}
                onSelect={setActiveBusiness}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <QuickStatCard
              label="New Leads"
              value={animatedMetrics.newLeads}
              trend={currentBusiness.leads.trendPercent}
              unit="this week"
              color={businessMeta.color}
              icon={<Users className="w-5 h-5" />}
            />
            <QuickStatCard
              label="Pipeline Value"
              value={`$${(animatedMetrics.pipeline / 1000).toFixed(0)}k`}
              trend={8}
              unit="total"
              color={businessMeta.color}
              icon={<Target className="w-5 h-5" />}
            />
            <QuickStatCard
              label="MTD Revenue"
              value={`$${(animatedMetrics.revenue / 1000).toFixed(1)}k`}
              trend={currentBusiness.accounting.monthlyTargetPercent}
              unit={`${currentBusiness.accounting.monthlyTargetPercent}% of target`}
              color={businessMeta.color}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <QuickStatCard
              label="Win Rate"
              value={`${currentBusiness.leads.winRate}%`}
              trend={currentBusiness.leads.winRate > 30 ? 5 : -3}
              unit="conversion"
              color={businessMeta.color}
              icon={<Zap className="w-5 h-5" />}
            />
          </div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              <LeadsPipeline data={currentBusiness.leads} color={businessMeta.color} />
              <UnitEconomicsSection data={currentBusiness.unitEconomics} color={businessMeta.color} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <AccountingSection data={currentBusiness.accounting} businessTarget={businessMeta.revenueTarget} color={businessMeta.color} />
              <BusinessHealthSection data={currentBusiness.health} color={businessMeta.color} />
            </div>
          </div>

          {/* Marketing Section - Full Width */}
          <MarketingSection data={currentBusiness.marketing} color={businessMeta.color} />

          {/* Footer - Data Attribution */}
          <div className="border-t border-purple-500/20 pt-6 text-center text-purple-400/40 text-xs font-mono">
            Data Last Updated: {new Date().toLocaleTimeString()} | Mock Data - Ready for Live API Integration
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Quick Stat Card Component
 */
function QuickStatCard({ label, value, trend, unit, color, icon }) {
  const isTrendUp = trend >= 0;

  return (
    <div className="relative">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition">
        <div className="flex items-start justify-between mb-3">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{label}</div>
          <div style={{ color }} className="opacity-60">
            {icon}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-2xl font-semibold text-slate-50 mb-1">
            {value}
          </div>
          <p className="text-slate-500 text-xs">{unit}</p>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1" style={{ color: isTrendUp ? '#10b981' : '#ef4444' }}>
            {isTrendUp ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span className="text-xs font-semibold">{Math.abs(trend)}%</span>
          </div>
          <span className="text-slate-600 text-xs">vs last week</span>
        </div>
      </div>
    </div>
  );
}
