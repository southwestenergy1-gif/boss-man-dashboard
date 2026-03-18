# 🔌 API Integration Guide

Complete reference for integrating BOSS MAN with real data sources (GoHighLevel, Facebook Ads, QuickBooks).

## API Overview

| API | Purpose | Endpoint | Status |
|-----|---------|----------|--------|
| **GoHighLevel** | Leads, pipeline, opportunities | REST | Ready |
| **Facebook Ads** | Ad spend, ROAS, campaign metrics | Graph API | Ready |
| **QuickBooks** | Revenue, expenses, accounting | OAuth 2.0 | Ready |

---

## Step 1: Set Up Environment Variables

Create `.env.local` file in project root:

```env
# GoHighLevel API
REACT_APP_GHL_API_KEY=pit-xxxxxxxxxxxxx
REACT_APP_GHL_LOCATION_ID=8lhNwDfFaYq79D0gGjCE

# Facebook Ads
REACT_APP_FACEBOOK_ACCESS_TOKEN=EAAmWwtxHLNIBQx4...
REACT_APP_FACEBOOK_AD_ACCOUNT_ID=558964757978719

# QuickBooks (if using)
REACT_APP_QB_REALM_ID=1234567890
REACT_APP_QB_ACCESS_TOKEN=xxxxx

# API Rate Limits
REACT_APP_API_CACHE_TIME=300000  # 5 minutes
```

**Never commit .env.local to Git!** It's in .gitignore.

---

## Integration 1: GoHighLevel API

### Getting API Keys

1. Log in to GHL: https://app.gohighlevel.com
2. Go to Settings → Integrations → API & Webhooks
3. Copy API Key: `pit-xxxxxxxxxxxxx`
4. Get Location ID from URL when viewing location

### What We're Fetching

- New leads (this week)
- Pipeline breakdown (stages)
- Win rate (closed vs total)
- Days in pipeline (avg)
- Lead trend (% vs last week)

### Create GHL Service

Create `src/services/ghlService.js`:

```javascript
const API_BASE = 'https://rest.gohighlevel.com/v1';
const API_KEY = import.meta.env.REACT_APP_GHL_API_KEY;
const LOCATION_ID = import.meta.env.REACT_APP_GHL_LOCATION_ID;

export async function fetchLeadData() {
  try {
    // Fetch all opportunities for this location
    const response = await fetch(
      `${API_BASE}/opportunities?locationId=${LOCATION_ID}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.status}`);
    }

    const data = await response.json();
    const opportunities = data.opportunities || [];

    // Process data
    return {
      newThisWeek: countNewLeads(opportunities),
      trendPercent: calculateTrend(opportunities),
      pipelineValue: calculatePipelineValue(opportunities),
      pipelineBreakdown: getPipelineBreakdown(opportunities),
      winRate: calculateWinRate(opportunities),
      avgDaysInPipeline: calculateAvgDaysInPipeline(opportunities)
    };
  } catch (error) {
    console.error('Failed to fetch GHL data:', error);
    throw error;
  }
}

// Helper functions
function countNewLeads(opportunities) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return opportunities.filter(opp => {
    const createdAt = new Date(opp.createdAt);
    return createdAt > oneWeekAgo;
  }).length;
}

function calculateTrend(opportunities) {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const thisWeek = opportunities.filter(opp => {
    const date = new Date(opp.createdAt);
    return date >= thisWeekStart && date <= now;
  }).length;

  const lastWeek = opportunities.filter(opp => {
    const date = new Date(opp.createdAt);
    return date >= lastWeekStart && date < thisWeekStart;
  }).length;

  if (lastWeek === 0) return 0;
  return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
}

function calculatePipelineValue(opportunities) {
  // Sum all open opportunities
  return opportunities
    .filter(opp => opp.status !== 'won' && opp.status !== 'lost')
    .reduce((sum, opp) => sum + (parseFloat(opp.value) || 0), 0);
}

function getPipelineBreakdown(opportunities) {
  const stages = {};

  opportunities.forEach(opp => {
    // GHL uses: lead, contact, opportunity, qualified, proposal, negotiation, won, lost
    const stageName = mapGHLStage(opp.pipelineStageId);
    
    if (!stages[stageName]) {
      stages[stageName] = { value: 0, count: 0 };
    }
    
    if (opp.status !== 'lost') {
      stages[stageName].value += parseFloat(opp.value) || 0;
      stages[stageName].count += 1;
    }
  });

  return Object.entries(stages)
    .map(([stage, data]) => ({
      stage,
      value: Math.round(data.value),
      count: data.count
    }))
    .sort((a, b) => b.value - a.value);
}

function mapGHLStage(stageId) {
  const stageMap = {
    'lead': 'Lead',
    'contact': 'Contact',
    'opportunity': 'Opportunity',
    'qualified': 'Qualified',
    'proposal': 'Proposal',
    'negotiation': 'Negotiation',
    'won': 'Closed',
    'lost': 'Lost'
  };
  return stageMap[stageId] || 'Other';
}

function calculateWinRate(opportunities) {
  const won = opportunities.filter(opp => opp.status === 'won').length;
  const total = opportunities.filter(opp => opp.status !== 'lost').length;
  
  return total === 0 ? 0 : Math.round((won / total) * 100);
}

function calculateAvgDaysInPipeline(opportunities) {
  const days = opportunities
    .filter(opp => opp.status !== 'lost')
    .map(opp => {
      const created = new Date(opp.createdAt);
      const now = new Date();
      return Math.floor((now - created) / (1000 * 60 * 60 * 24));
    });

  if (days.length === 0) return 0;
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  return Math.round(avg);
}

// Cache implementation
const cache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000 // 5 minutes
};

export async function fetchLeadDataCached() {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < cache.ttl) {
    return cache.data;
  }

  const data = await fetchLeadData();
  cache.data = data;
  cache.timestamp = now;
  return data;
}
```

### Testing GHL Integration

```javascript
// In BossManDashboard.jsx
import { fetchLeadDataCached } from './services/ghlService';

useEffect(() => {
  const loadData = async () => {
    try {
      const leadData = await fetchLeadDataCached();
      console.log('GHL Data:', leadData);
      setCurrentBusiness(prev => ({
        ...prev,
        leads: leadData
      }));
    } catch (error) {
      console.error('Error loading GHL data:', error);
    }
  };

  loadData();
}, [activeBusiness]);
```

---

## Integration 2: Facebook Ads API

### Getting API Keys

1. Go to Facebook Business Suite: https://business.facebook.com
2. Settings → Users & Assets → System Users
3. Create new system user with "Admin" role
4. Generate access token (token expires in 60 days)
5. Copy Ad Account ID from Ads Manager URL

### What We're Fetching

- Total ad spend
- Cost per lead (CPL)
- ROAS (Return on Ad Spend)
- Leads by campaign
- Campaign breakdown

### Create Facebook Service

Create `src/services/facebookService.js`:

```javascript
const API_BASE = 'https://graph.facebook.com/v18.0';
const ACCESS_TOKEN = import.meta.env.REACT_APP_FACEBOOK_ACCESS_TOKEN;
const AD_ACCOUNT_ID = import.meta.env.REACT_APP_FACEBOOK_AD_ACCOUNT_ID;

export async function fetchAdMetrics() {
  try {
    const response = await fetch(
      `${API_BASE}/${AD_ACCOUNT_ID}/campaigns`,
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const data = await response.json();
    const campaigns = data.data || [];

    // Fetch insights for each campaign
    const campaignData = await Promise.all(
      campaigns.map(campaign => fetchCampaignInsights(campaign.id, campaign.name))
    );

    return {
      adSpend: calculateTotalSpend(campaignData),
      campaigns: campaignData
    };
  } catch (error) {
    console.error('Failed to fetch Facebook data:', error);
    throw error;
  }
}

async function fetchCampaignInsights(campaignId, campaignName) {
  const fields = [
    'spend',
    'impressions',
    'clicks',
    'actions'
  ].join(',');

  const response = await fetch(
    `${API_BASE}/${campaignId}/insights?fields=${fields}&access_token=${ACCESS_TOKEN}`
  );

  const data = await response.json();
  const insight = data.data[0] || {};

  // Calculate metrics from Facebook data
  const spend = parseFloat(insight.spend) || 0;
  const leads = getLeadCount(insight.actions);
  const cpl = leads > 0 ? Math.round(spend / leads) : 0;

  // ROAS calculation: requires conversion value from Facebook pixel
  // This is simplified - you'd need to set up Facebook Pixel conversions
  const conversionValue = getConversionValue(insight.actions);
  const roas = spend > 0 ? (conversionValue / spend).toFixed(2) : 0;

  return {
    name: campaignName,
    spend: Math.round(spend),
    leads: leads,
    roas: parseFloat(roas),
    cpl: cpl
  };
}

function getLeadCount(actions) {
  if (!actions || !Array.isArray(actions)) return 0;
  
  // Facebook returns actions as array of {action_type, value}
  const leadAction = actions.find(a => a.action_type === 'lead');
  return leadAction ? parseInt(leadAction.value) : 0;
}

function getConversionValue(actions) {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const valueAction = actions.find(a => a.action_type === 'purchase');
  return valueAction ? parseFloat(valueAction.value) : 0;
}

function calculateTotalSpend(campaigns) {
  return campaigns.reduce((sum, c) => sum + c.spend, 0);
}

// Alternative: Fetch with date range
export async function fetchAdMetricsForDateRange(startDate, endDate) {
  const params = new URLSearchParams({
    fields: 'spend,impressions,clicks,actions',
    time_range: JSON.stringify({
      since: startDate.toISOString().split('T')[0],
      until: endDate.toISOString().split('T')[0]
    }),
    access_token: ACCESS_TOKEN
  });

  const response = await fetch(
    `${API_BASE}/${AD_ACCOUNT_ID}/insights?${params}`
  );

  return response.json();
}

// Cache
const cache = {
  data: null,
  timestamp: null,
  ttl: 5 * 60 * 1000
};

export async function fetchAdMetricsCached() {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < cache.ttl) {
    return cache.data;
  }

  const data = await fetchAdMetrics();
  cache.data = data;
  cache.timestamp = now;
  return data;
}
```

### Testing Facebook Integration

```javascript
import { fetchAdMetricsCached } from './services/facebookService';

useEffect(() => {
  const loadData = async () => {
    try {
      const adData = await fetchAdMetricsCached();
      console.log('Facebook Data:', adData);
      setCurrentBusiness(prev => ({
        ...prev,
        marketing: adData
      }));
    } catch (error) {
      console.error('Error loading Facebook data:', error);
    }
  };

  loadData();
}, [activeBusiness]);
```

---

## Integration 3: QuickBooks API (Optional)

### Getting Credentials

1. Create QuickBooks app: https://developer.intuit.com
2. Generate OAuth credentials (Client ID + Secret)
3. Authorize your company realm
4. Get Realm ID from authorization response

### What We're Fetching

- MTD Revenue (from Income accounts)
- YTD Revenue
- Expense breakdown
- Profit margin calculation

### Create QuickBooks Service

Create `src/services/quickbooksService.js`:

```javascript
const QB_BASE = 'https://quickbooks.api.intuit.com/v2/companies';

export async function fetchAccountingData(realmId, accessToken) {
  try {
    // Fetch revenue accounts
    const revenueQuery = "select * from Account where AccountType = 'Income'";
    const revenueResponse = await queryQuickBooks(realmId, revenueQuery, accessToken);
    
    // Fetch expense accounts
    const expenseQuery = "select * from Account where AccountType = 'Expense'";
    const expenseResponse = await queryQuickBooks(realmId, expenseQuery, accessToken);

    // You'll need to query actual Journal Entries for current month data
    const mtdData = await fetchMonthData(realmId, accessToken);

    return {
      revenueMTD: mtdData.revenue,
      revenueYTD: mtdData.ytdRevenue,
      expenses: calculateExpenseBreakdown(expenseResponse.QueryResponse),
      profitMarginPercent: calculateMargin(mtdData)
    };
  } catch (error) {
    console.error('Failed to fetch QB data:', error);
    throw error;
  }
}

async function queryQuickBooks(realmId, query, accessToken) {
  const encodedQuery = encodeURIComponent(query);
  
  const response = await fetch(
    `${QB_BASE}/${realmId}/query?query=${encodedQuery}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`QB API error: ${response.status}`);
  }

  return response.json();
}

async function fetchMonthData(realmId, accessToken) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().split('T')[0];
  const monthEnd = now.toISOString().split('T')[0];

  // Query JournalEntry for current month
  const query = `
    select * from JournalEntry 
    where TxnDate >= '${monthStart}' 
    and TxnDate <= '${monthEnd}'
  `;

  const response = await queryQuickBooks(realmId, query, accessToken);
  const entries = response.QueryResponse?.JournalEntry || [];

  // Calculate revenue and expenses
  let mtdRevenue = 0;
  let mtdExpenses = 0;

  entries.forEach(entry => {
    entry.Line?.forEach(line => {
      const amount = parseFloat(line.Amount || 0);
      if (line.DetailType === 'JournalEntryLineDetail') {
        const accountRef = line.JournalEntryLineDetail?.AccountRef;
        // You'll need to determine account type to categorize
        if (isRevenueAccount(accountRef)) {
          mtdRevenue += amount;
        } else if (isExpenseAccount(accountRef)) {
          mtdExpenses += amount;
        }
      }
    });
  });

  return {
    revenue: mtdRevenue,
    expenses: mtdExpenses,
    ytdRevenue: mtdRevenue * 3 // Approximate - fetch actual YTD
  };
}

function calculateExpenseBreakdown(queryResponse) {
  // Group expenses by account type
  const accounts = queryResponse?.Account || [];
  
  return {
    salaries: getAccountBalance(accounts, 'Salaries'),
    marketing: getAccountBalance(accounts, 'Marketing'),
    operations: getAccountBalance(accounts, 'Other Operating Expenses'),
    other: getAccountBalance(accounts, 'Other')
  };
}

function getAccountBalance(accounts, accountName) {
  const account = accounts.find(a => 
    a.Name.toLowerCase().includes(accountName.toLowerCase())
  );
  return account ? Math.abs(parseFloat(account.CurrentBalance)) : 0;
}

function calculateMargin(data) {
  const profit = data.revenue - data.expenses;
  return data.revenue > 0 ? Math.round((profit / data.revenue) * 100) : 0;
}

function isRevenueAccount(accountRef) {
  // Map account refs to determine type
  // Would need actual account lookup
  return false;
}

function isExpenseAccount(accountRef) {
  return false;
}
```

---

## Implementation in Dashboard

### Option A: Fetch All Data on Mount

```javascript
import { fetchLeadDataCached } from '../services/ghlService';
import { fetchAdMetricsCached } from '../services/facebookService';

export default function BossManDashboard() {
  const [activeBusiness, setActiveBusiness] = useState('solar');
  const [currentBusiness, setCurrentBusiness] = useState(mockData.solar);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRealData = async () => {
      setLoading(true);
      try {
        const [leads, marketing] = await Promise.all([
          fetchLeadDataCached(),
          fetchAdMetricsCached()
        ]);

        setCurrentBusiness(prev => ({
          ...prev,
          leads,
          marketing
        }));
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to mock data on error
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, []);

  // Rest of component...
}
```

### Option B: Fetch on Interval (Auto-Refresh)

```javascript
useEffect(() => {
  const loadData = async () => {
    try {
      const leadData = await fetchLeadDataCached();
      setCurrentBusiness(prev => ({
        ...prev,
        leads: leadData
      }));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  // Initial load
  loadData();

  // Auto-refresh every 30 seconds
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, [activeBusiness]);
```

---

## Error Handling

```javascript
// Wrap API calls with proper error handling
export async function fetchWithRetry(fn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1} failed, retrying...`, error);
      
      if (i < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }
  
  throw lastError;
}

// Usage
const leadData = await fetchWithRetry(() => fetchLeadData());
```

---

## Rate Limiting

| API | Rate Limit | Solution |
|-----|-----------|----------|
| **GHL** | 1000/hour | Cache 5 min |
| **Facebook** | 200 calls/hour | Cache 5 min |
| **QB** | 120/min | Cache 5 min |

```javascript
// Implement rate limit tracking
const apiCallLog = {
  ghl: [],
  facebook: [],
  quickbooks: []
};

function canMakeCall(api, limit, timeWindow) {
  const now = Date.now();
  const window = timeWindow * 1000;
  
  const recentCalls = apiCallLog[api].filter(
    timestamp => now - timestamp < window
  );
  
  return recentCalls.length < limit;
}
```

---

## Troubleshooting

### "401 Unauthorized"
- Check API key/token is current
- Regenerate access token
- Verify correct key for the right environment

### "404 Not Found"
- Verify Location ID / Ad Account ID
- Check API endpoint URL
- Ensure resource exists

### No Data Returned
- Check time range in queries
- Verify account has data for period
- Check browser console for errors

### Slow Performance
- Reduce API call frequency
- Increase cache TTL
- Use lazy loading for sections

---

## API Documentation Links

- **GoHighLevel:** https://docs.gohighlevel.com/api-reference
- **Facebook Ads:** https://developers.facebook.com/docs/marketing-api
- **QuickBooks:** https://developer.intuit.com/app/developer/qbo/docs/api/accounting-api/quickstart

---

**Ready to integrate?** Start with GHL (leads are most critical), then add Facebook Ads, then QuickBooks accounting.
