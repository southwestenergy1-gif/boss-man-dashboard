import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Zap, DollarSign, Users, Target, LayoutDashboard, ClipboardList } from 'lucide-react';
import { businessesMetadata, mockData } from '../data/mockData';
import BusinessSelector from './BusinessSelector';
import LeadsPipeline from './sections/LeadsPipeline';
import AccountingSection from './sections/AccountingSection';
import UnitEconomicsSection from './sections/UnitEconomicsSection';
import MarketingSection from './sections/MarketingSection';
import BusinessHealthSection from './sections/BusinessHealthSection';
import LeadManager from './sections/LeadManager';

export default function BossManDashboard() {
  const [activeBusiness, setActiveBusiness] = useState('solar');
  const [activeView, setActiveView] = useState('dashboard');

  const currentBusiness = mockData[activeBusiness];
  const businessMeta = businessesMetadata[activeBusiness];

  const views = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'leads', label: 'Leads CRM', icon: <ClipboardList className="w-4 h-4" /> }
  ];

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
                  <div className="w-2 h-2 bg-amber-400 rounded-full"></div>
                  <span className="text-amber-400 text-sm font-medium">Demo Data</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              {/* Business Selector */}
              <BusinessSelector
                businesses={businessesMetadata}
                active={activeBusiness}
                onSelect={setActiveBusiness}
              />
              {/* View Switcher */}
              <nav className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1" aria-label="Views">
                {views.map(view => (
                  <button
                    key={view.id}
                    onClick={() => setActiveView(view.id)}
                    aria-pressed={activeView === view.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${
                      activeView === view.id
                        ? 'bg-slate-800 text-slate-50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {view.icon}
                    {view.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          {activeView === 'leads' ? (
            <LeadManager businessId={activeBusiness} businessMeta={businessMeta} />
          ) : (
            <>
              {/* Quick Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <QuickStatCard
                  label="New Leads"
                  value={currentBusiness.leads.newThisWeek}
                  trend={currentBusiness.leads.trendPercent}
                  trendLabel="vs last week"
                  unit="this week"
                  color={businessMeta.color}
                  icon={<Users className="w-5 h-5" />}
                />
                <QuickStatCard
                  label="Pipeline Value"
                  value={`$${(currentBusiness.leads.pipelineValue / 1000).toFixed(0)}k`}
                  trend={currentBusiness.leads.pipelineTrendPercent}
                  trendLabel="vs last week"
                  unit="total open deals"
                  color={businessMeta.color}
                  icon={<Target className="w-5 h-5" />}
                />
                <QuickStatCard
                  label="MTD Revenue"
                  value={`$${(currentBusiness.accounting.revenueMTD / 1000).toFixed(1)}k`}
                  trend={currentBusiness.accounting.revenueTrendPercent}
                  trendLabel="vs last month"
                  unit={`${currentBusiness.accounting.monthlyTargetPercent}% of target`}
                  color={businessMeta.color}
                  icon={<DollarSign className="w-5 h-5" />}
                />
                <QuickStatCard
                  label="Win Rate"
                  value={`${currentBusiness.leads.winRate}%`}
                  trend={currentBusiness.leads.winRateTrendPercent}
                  trendLabel="vs last month"
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
            </>
          )}

          {/* Footer - Data Attribution */}
          <div className="border-t border-slate-800 pt-6 text-center text-slate-500 text-sm">
            Demo data — ready for live API integration (GHL, QuickBooks, Facebook Ads)
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Quick Stat Card Component
 */
function QuickStatCard({ label, value, trend, trendLabel, unit, color, icon }) {
  const isTrendUp = trend >= 0;

  return (
    <div className="relative">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-slate-700 transition">
        <div className="flex items-start justify-between mb-3">
          <div className="text-slate-300 text-[13px] font-semibold uppercase tracking-wide">{label}</div>
          <div style={{ color }} className="opacity-70">
            {icon}
          </div>
        </div>

        <div className="mb-4">
          <div className="text-3xl font-semibold text-slate-50 mb-1">
            {value}
          </div>
          <p className="text-slate-400 text-sm">{unit}</p>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1" style={{ color: isTrendUp ? '#10b981' : '#ef4444' }}>
            {isTrendUp ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="text-sm font-semibold">{isTrendUp ? '+' : '-'}{Math.abs(trend)}%</span>
          </div>
          <span className="text-slate-400 text-sm">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}
