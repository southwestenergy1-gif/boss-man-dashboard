/**
 * BOSS MAN MOCK DATA
 * Structure designed for easy replacement with real APIs (GHL, Facebook, QuickBooks)
 * 
 * REPLACEMENT NOTES:
 * - GHL: Use Location API to fetch leads, deals, contacts
 * - Facebook Ads: Use Ads Insights API to get ad spend, ROAS, campaign data
 * - QuickBooks: Use Accounting API to fetch revenue, expenses, profit metrics
 */

export const businessesMetadata = {
  solar: {
    id: "solar",
    name: "Solar",
    color: "#00FF88", // Neon green
    revenueTarget: 50000,
    icon: "⚡"
  },
  construction: {
    id: "construction",
    name: "Construction",
    color: "#00D4FF", // Neon cyan
    revenueTarget: 40000,
    icon: "🏗️"
  },
  homeImprovement: {
    id: "homeImprovement",
    name: "Home Improvement",
    color: "#FF00FF", // Neon magenta
    revenueTarget: 35000,
    icon: "🏠"
  }
};

export const mockData = {
  solar: {
    // LEADS & PIPELINE
    leads: {
      newThisWeek: 15,
      trendPercent: 12, // +12% vs last week
      pipelineValue: 120000,
      pipelineBreakdown: [
        { stage: "Qualified", value: 45000, count: 3 },
        { stage: "Proposal", value: 35000, count: 2 },
        { stage: "Negotiation", value: 25000, count: 1 },
        { stage: "Other", value: 15000, count: 1 }
      ],
      winRate: 32,
      avgDaysInPipeline: 18
    },
    
    // ACCOUNTING
    accounting: {
      revenueMTD: 42500, // March so far
      revenueYTD: 89000, // Jan + Feb + March
      revenueTarget: 50000,
      expenses: {
        salaries: 15000,
        marketing: 8500,
        operations: 3200,
        other: 2100
      },
      profitMarginPercent: 28,
      monthlyTargetPercent: 85 // 42.5k / 50k
    },
    
    // UNIT ECONOMICS
    unitEconomics: {
      cac: 285, // Customer Acquisition Cost
      ltv: 8500, // Lifetime Value
      paybackPeriod: 1.2, // months
      ltv_cac_ratio: 29.8
    },
    
    // MARKETING
    marketing: {
      adSpend: 8500,
      campaigns: [
        { name: "Facebook Lead Gen", spend: 3500, leads: 12, roas: 3.2, cpl: 292 },
        { name: "Google Local Svc", spend: 2800, leads: 2, roas: 5.1, cpl: 1400 },
        { name: "Organic/Referral", spend: 0, leads: 1, roas: 0, cpl: 0 },
        { name: "Email Nurture", spend: 2200, leads: 0, roas: 0, cpl: 0 }
      ]
    },
    
    // BUSINESS HEALTH
    health: {
      nextMilestone: "$50k revenue this month",
      keyMetrics: [
        { label: "Close Rate", value: "32%", icon: "🎯" },
        { label: "Avg Deal Size", value: "$8.2k", icon: "💰" },
        { label: "Sales Cycle", value: "18 days", icon: "📅" },
        { label: "Team Size", value: "3 reps", icon: "👥" }
      ]
    }
  },

  construction: {
    leads: {
      newThisWeek: 8,
      trendPercent: -5, // -5% vs last week
      pipelineValue: 85000,
      pipelineBreakdown: [
        { stage: "Qualified", value: 32000, count: 2 },
        { stage: "Proposal", value: 28000, count: 1 },
        { stage: "Negotiation", value: 15000, count: 1 },
        { stage: "Other", value: 10000, count: 1 }
      ],
      winRate: 28,
      avgDaysInPipeline: 22
    },
    
    accounting: {
      revenueMTD: 36200,
      revenueYTD: 72800,
      revenueTarget: 40000,
      expenses: {
        salaries: 12000,
        materials: 7500,
        operations: 2800,
        other: 1500
      },
      profitMarginPercent: 24,
      monthlyTargetPercent: 90
    },
    
    unitEconomics: {
      cac: 420,
      ltv: 12000,
      paybackPeriod: 1.8,
      ltv_cac_ratio: 28.6
    },
    
    marketing: {
      adSpend: 6200,
      campaigns: [
        { name: "Facebook - Homeowners", spend: 2500, leads: 5, roas: 2.8, cpl: 500 },
        { name: "Google Ads", spend: 2000, leads: 2, roas: 4.2, cpl: 1000 },
        { name: "Local Networking", spend: 800, leads: 1, roas: 0, cpl: 800 },
        { name: "Email", spend: 900, leads: 0, roas: 0, cpl: 0 }
      ]
    },
    
    health: {
      nextMilestone: "$40k revenue target this month",
      keyMetrics: [
        { label: "Close Rate", value: "28%", icon: "🎯" },
        { label: "Avg Deal Size", value: "$12.1k", icon: "💰" },
        { label: "Sales Cycle", value: "22 days", icon: "📅" },
        { label: "Team Size", value: "2 reps", icon: "👥" }
      ]
    }
  },

  homeImprovement: {
    leads: {
      newThisWeek: 12,
      trendPercent: 15,
      pipelineValue: 95000,
      pipelineBreakdown: [
        { stage: "Qualified", value: 38000, count: 3 },
        { stage: "Proposal", value: 32000, count: 2 },
        { stage: "Negotiation", value: 15000, count: 1 },
        { stage: "Other", value: 10000, count: 1 }
      ],
      winRate: 30,
      avgDaysInPipeline: 20
    },
    
    accounting: {
      revenueMTD: 28500,
      revenueYTD: 58200,
      revenueTarget: 35000,
      expenses: {
        salaries: 9500,
        materials: 6200,
        operations: 2500,
        other: 1200
      },
      profitMarginPercent: 27,
      monthlyTargetPercent: 81
    },
    
    unitEconomics: {
      cac: 385,
      ltv: 11000,
      paybackPeriod: 1.5,
      ltv_cac_ratio: 28.6
    },
    
    marketing: {
      adSpend: 4800,
      campaigns: [
        { name: "Facebook - Homeowners", spend: 2000, leads: 5, roas: 3.2, cpl: 400 },
        { name: "Google Ads", spend: 1800, leads: 4, roas: 2.9, cpl: 450 },
        { name: "Local Partnerships", spend: 1000, leads: 3, roas: 0, cpl: 333 }
      ]
    },
    
    health: {
      nextMilestone: "$35k revenue target by month end",
      keyMetrics: [
        { label: "Close Rate", value: "30%", icon: "🎯" },
        { label: "Avg Deal Size", value: "$10.8k", icon: "💰" },
        { label: "Sales Cycle", value: "20 days", icon: "📅" },
        { label: "Team Size", value: "2 reps", icon: "👥" }
      ]
    }
  }
};

/**
 * INTEGRATION GUIDE
 * 
 * Step 1: Replace mockData.solar with real API calls
 * 
 * Example GHL Integration:
 * ```
 * async function fetchLeadData(locationId) {
 *   const response = await fetch(`https://rest.gohighlevel.com/v1/opportunities?locationId=${locationId}`, {
 *     headers: { Authorization: `Bearer ${process.env.REACT_APP_GHL_API_KEY}` }
 *   });
 *   const deals = await response.json();
 *   return formatLeadsData(deals);
 * }
 * ```
 * 
 * Example Facebook Ads Integration:
 * ```
 * async function fetchAdMetrics(adAccountId) {
 *   const response = await fetch(
 *     `https://graph.facebook.com/v18.0/${adAccountId}/insights?fields=spend,actions,action_values&access_token=${token}`
 *   );
 *   const metrics = await response.json();
 *   return formatAdMetrics(metrics);
 * }
 * ```
 * 
 * Example QuickBooks Integration:
 * ```
 * async function fetchAccounting(realmId) {
 *   const response = await fetch(`https://quickbooks.api.intuit.com/v2/companies/${realmId}/query?query=select * from Account`, {
 *     headers: { Authorization: `Bearer ${quickbooksToken}` }
 *   });
 *   return formatAccountingData(response.json());
 * }
 * ```
 */
