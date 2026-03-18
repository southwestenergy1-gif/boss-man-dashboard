import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function AccountingSection({ data, businessTarget, color }) {
  const expenseData = Object.entries(data.expenses).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const COLORS = ['#00FF88', '#00D4FF', '#FF00FF', '#FFB800'];
  const totalExpenses = Object.values(data.expenses).reduce((a, b) => a + b, 0);

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
          💰 Accounting
        </h2>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-gray-500 text-xs font-mono uppercase mb-1">MTD Revenue</p>
            <div className="text-2xl font-bold text-green-400">
              ${(data.revenueMTD / 1000).toFixed(1)}k
            </div>
          </div>

          <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
            <p className="text-gray-500 text-xs font-mono uppercase mb-1">YTD Revenue</p>
            <div className="text-2xl font-bold text-green-400">
              ${(data.revenueYTD / 1000).toFixed(1)}k
            </div>
          </div>
        </div>

        {/* Revenue vs Target Progress */}
        <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4 mb-6">
          <p className="text-gray-500 text-xs font-mono uppercase mb-2">Monthly Target Progress</p>
          <div className="flex items-end gap-3 mb-3">
            <div className="text-2xl font-black" style={{ color }}>
              {data.monthlyTargetPercent}%
            </div>
            <p className="text-gray-600 text-xs">
              ${(data.revenueMTD / 1000).toFixed(1)}k of ${(businessTarget / 1000).toFixed(0)}k
            </p>
          </div>

          {/* Animated progress bar */}
          <div className="w-full h-3 bg-gray-800/50 rounded-full overflow-hidden border border-gray-700/50">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(data.monthlyTargetPercent, 100)}%`,
                backgroundColor: data.monthlyTargetPercent >= 100 ? '#4ade80' : color,
                boxShadow: `0 0 15px ${data.monthlyTargetPercent >= 100 ? '#4ade80' : color}80`
              }}
            ></div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="mb-4">
          <p className="text-gray-500 text-xs font-mono uppercase mb-3">Expense Breakdown</p>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                  animationDuration={800}
                >
                  {expenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Legend */}
          <div className="grid grid-cols-2 gap-2">
            {expenseData.map((expense, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                ></div>
                <span className="text-gray-400">
                  {expense.name}: ${(expense.value / 1000).toFixed(1)}k
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-gray-950/50 border border-gray-700/30 rounded-lg p-4">
          <p className="text-gray-500 text-xs font-mono uppercase mb-2">Profit Margin</p>
          <div className="flex items-center gap-2">
            <div className="text-3xl font-black text-purple-400">
              {data.profitMarginPercent}%
            </div>
            <p className="text-gray-600 text-xs">
              Net margin on ${(data.revenueMTD - totalExpenses).toFixed(0)} profit
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
