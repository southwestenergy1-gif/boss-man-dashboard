# 🔥 BOSS MAN - Southwest Energy Operations Dashboard

## What Is This?

**BOSS MAN** is an insane, cyberpunk-aesthetic operations dashboard built for Christopher's Southwest Energy business. It displays real-time metrics across three business units (Solar, Construction, Aqua Systems) with interactive tabs, beautiful charts, and a futuristic vibe that looks like a tech startup's command center.

## Features

✅ **Business Selector** - Switch between Solar, Construction, and Aqua Systems with animated tabs  
✅ **Leads & Pipeline** - New leads, pipeline breakdown, win rates, sales cycle metrics  
✅ **Accounting** - Revenue (MTD/YTD), expenses, profit margins, target progress  
✅ **Unit Economics** - CAC, LTV, payback period, LTV:CAC ratio  
✅ **Marketing** - Ad spend, ROAS by campaign, cost per lead breakdown  
✅ **Business Health** - Revenue targets, key metrics snapshot, status indicators  

✨ **Cyberpunk Design:**
- Dark metallic theme with neon accents (cyan, green, magenta, yellow)
- Glowing elements and smooth animations
- Backdrop blur effects
- Animated progress bars and pulsing indicators
- Mobile + Desktop responsive

## Tech Stack

- **React 18** - Interactive component framework
- **Recharts** - Beautiful, interactive charts
- **Tailwind CSS** - Dark theme styling + neon utilities
- **Lucide Icons** - Clean icon library
- **Framer Motion** - Smooth animations (ready for advanced use)

## Project Structure

```
boss-man-dashboard/
├── src/
│   ├── components/
│   │   ├── BossManDashboard.jsx        # Main dashboard component
│   │   ├── BusinessSelector.jsx         # Tab selector component
│   │   └── sections/
│   │       ├── LeadsPipeline.jsx
│   │       ├── AccountingSection.jsx
│   │       ├── UnitEconomicsSection.jsx
│   │       ├── MarketingSection.jsx
│   │       └── BusinessHealthSection.jsx
│   ├── data/
│   │   └── mockData.js                  # Mock data structure + API integration notes
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md (this file)
```

## Setup & Installation

### Prerequisites
- Node.js 16+ and npm

### Installation Steps

```bash
# 1. Navigate to the project
cd boss-man-dashboard

# 2. Install dependencies
npm install

# 3. Start development server
npm start

# 4. Open in browser
# Dashboard will be available at http://localhost:5173
```

### Build for Production

```bash
npm run build

# Output goes to dist/ folder
# Deploy the dist folder to any static host (Netlify, Vercel, AWS S3, etc.)
```

## Using the Dashboard

### Switching Between Businesses

Click the business tabs at the top (Solar | Construction | Aqua Systems) to switch between different business units. All metrics update instantly with smooth animations.

### Understanding the Metrics

**Quick Stats Row:**
- **New Leads** - Count this week with trend vs last week
- **Pipeline Value** - Total opportunity value in all stages
- **MTD Revenue** - Month-to-date revenue + % of monthly target
- **Win Rate** - Conversion rate with visual progress bar

**Leads & Pipeline Section:**
- Bar chart showing pipeline breakdown by stage
- New leads with trend indicator
- Days in pipeline (sales cycle)
- Win rate with animated progress

**Accounting Section:**
- MTD and YTD revenue comparison
- Progress toward monthly revenue target
- Expense breakdown (pie chart)
- Profit margin percentage

**Unit Economics Section:**
- **CAC** - Cost to acquire one customer
- **LTV** - Customer lifetime value
- **Payback Period** - Months until acquisition cost is recovered
- **LTV:CAC Ratio** - Health metric (target: 3:1 or higher)

**Marketing Section:**
- Ad spend across all campaigns
- Campaign performance (ROAS, Cost Per Lead)
- Interactive bar chart comparing spend vs leads
- Detailed campaign table

**Business Health:**
- Next business milestone
- Key metrics snapshot (close rate, deal size, team size)
- Live status indicator

## Replacing Mock Data with Real APIs

### Step 1: Set Environment Variables

Create a `.env` file in the project root:

```env
REACT_APP_GHL_API_KEY=pit-xxxxxxxxxxxxx
REACT_APP_GHL_LOCATION_ID=8lhNwDfFaYq79D0gGjCE
REACT_APP_FACEBOOK_ACCESS_TOKEN=EAAmWwtxHLNIBQx4...
REACT_APP_FACEBOOK_AD_ACCOUNT_ID=558964757978719
```

### Step 2: Create API Service Files

Create `src/services/ghlService.js`:

```javascript
// GoHighLevel API Integration Example
export async function fetchLeadData(locationId) {
  const response = await fetch(
    `https://rest.gohighlevel.com/v1/opportunities?locationId=${locationId}`,
    {
      headers: {
        Authorization: `Bearer ${import.meta.env.REACT_APP_GHL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) throw new Error('Failed to fetch leads');

  const data = await response.json();
  
  // Transform GHL data to match mockData structure
  return {
    newThisWeek: data.opportunities.filter(o => isThisWeek(o.createdAt)).length,
    pipelineValue: data.opportunities.reduce((sum, o) => sum + (o.value || 0), 0),
    pipelineBreakdown: transformPipelineData(data.opportunities),
    winRate: calculateWinRate(data.opportunities),
    avgDaysInPipeline: calculateAvgDays(data.opportunities),
    trendPercent: calculateTrend(data.opportunities)
  };
}

function isThisWeek(date) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return new Date(date) > weekAgo;
}

function transformPipelineData(opportunities) {
  // Group by stage and calculate totals
  const stages = {};
  opportunities.forEach(opp => {
    const stage = opp.stage || 'Other';
    if (!stages[stage]) stages[stage] = { value: 0, count: 0 };
    stages[stage].value += opp.value || 0;
    stages[stage].count += 1;
  });

  return Object.entries(stages).map(([stage, data]) => ({
    stage,
    value: data.value,
    count: data.count
  }));
}

function calculateWinRate(opportunities) {
  const closed = opportunities.filter(o => o.status === 'won').length;
  return opportunities.length > 0 ? Math.round((closed / opportunities.length) * 100) : 0;
}

function calculateAvgDays(opportunities) {
  const days = opportunities.map(o => {
    const created = new Date(o.createdAt);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  });
  return days.length > 0 ? Math.round(days.reduce((a, b) => a + b) / days.length) : 0;
}

function calculateTrend(opportunities) {
  // Compare this week vs last week
  const now = new Date();
  const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeekCount = opportunities.filter(o => 
    new Date(o.createdAt) > thisWeekStart
  ).length;

  const lastWeekCount = opportunities.filter(o => {
    const d = new Date(o.createdAt);
    return d > lastWeekStart && d <= thisWeekStart;
  }).length;

  if (lastWeekCount === 0) return 0;
  return Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
}
```

### Step 3: Create Facebook Ads Service

Create `src/services/facebookService.js`:

```javascript
// Facebook Ads API Integration Example
export async function fetchAdMetrics(adAccountId) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${adAccountId}/insights`,
    {
      params: {
        fields: 'spend,campaign_name,campaign_id,actions,action_values',
        access_token: import.meta.env.REACT_APP_FACEBOOK_ACCESS_TOKEN,
        time_range: { since: '2024-03-01', until: '2024-03-31' }
      }
    }
  );

  const data = await response.json();
  
  // Transform Facebook data to marketing section format
  return {
    adSpend: calculateTotalSpend(data.data),
    campaigns: transformCampaignData(data.data)
  };
}

function calculateTotalSpend(campaigns) {
  return campaigns.reduce((sum, c) => sum + parseFloat(c.spend || 0), 0);
}

function transformCampaignData(campaigns) {
  return campaigns.map(campaign => ({
    name: campaign.campaign_name,
    spend: parseFloat(campaign.spend || 0),
    leads: parseLeadCount(campaign.actions),
    roas: calculateROAS(campaign),
    cpl: calculateCPL(campaign)
  }));
}
```

### Step 4: Create QuickBooks Service

Create `src/services/quickbooksService.js`:

```javascript
// QuickBooks API Integration Example
export async function fetchAccountingData(realmId) {
  const query = "select * from Account where AccountType = 'Income' or AccountType = 'Expense'";
  
  const response = await fetch(
    `https://quickbooks.api.intuit.com/v2/companies/${realmId}/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getQuickBooksToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ Query: query })
    }
  );

  const data = await response.json();
  
  // Transform QB data to accounting section format
  return {
    revenueMTD: extractMonthRevenue(data.QueryResponse, 'this-month'),
    revenueYTD: extractYearRevenue(data.QueryResponse),
    expenses: extractExpenses(data.QueryResponse),
    profitMarginPercent: calculateMargin(data.QueryResponse)
  };
}
```

### Step 5: Update BossManDashboard Component

Modify `src/components/BossManDashboard.jsx` to fetch real data:

```javascript
import { fetchLeadData } from '../services/ghlService';
import { fetchAdMetrics } from '../services/facebookService';
import { fetchAccountingData } from '../services/quickbooksService';

export default function BossManDashboard() {
  const [activeBusiness, setActiveBusiness] = useState('solar');
  const [currentBusiness, setCurrentBusiness] = useState(mockData.solar);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        // Fetch from all APIs in parallel
        const [leads, marketing, accounting] = await Promise.all([
          fetchLeadData(process.env.REACT_APP_GHL_LOCATION_ID),
          fetchAdMetrics(process.env.REACT_APP_FACEBOOK_AD_ACCOUNT_ID),
          fetchAccountingData(process.env.REACT_APP_QB_REALM_ID)
        ]);

        // Merge with existing data
        setCurrentBusiness(prev => ({
          ...prev,
          leads,
          marketing,
          accounting
        }));
      } catch (error) {
        console.error('Failed to fetch real data:', error);
        // Fallback to mock data on error
      } finally {
        setLoading(false);
      }
    };

    // Fetch on component mount and every 30 seconds
    fetchRealData();
    const interval = setInterval(fetchRealData, 30000);
    return () => clearInterval(interval);
  }, [activeBusiness]);

  // Rest of component...
}
```

### Step 6: API Keys to Request

Contact the API providers to get these keys:

**GoHighLevel:**
- API Key: Found in GHL Settings → API Access
- Location ID: In URL when viewing a location

**Facebook Ads:**
- App ID & Secret: Facebook Developers console
- Access Token: Generated from Business Suite

**QuickBooks:**
- OAuth credentials for integration

## Customization

### Change Colors

Edit `src/data/mockData.js` and update the `businessesMetadata` color values:

```javascript
export const businessesMetadata = {
  solar: {
    color: "#00FF88", // Neon green → change to your color
    // ...
  }
};
```

### Adjust Metrics

Update `src/data/mockData.js` with new target values:

```javascript
solar: {
  accounting: {
    revenueTarget: 50000, // Change monthly target
    // ...
  }
}
```

### Modify Chart Types

Replace chart components in section files:
- `BarChart` → `LineChart` (for trends over time)
- `PieChart` → `DoughnutChart` (for different look)
- See [Recharts docs](https://recharts.org) for all options

## Performance Tips

1. **Debounce API calls** - Don't fetch more than every 30 seconds
2. **Use React.memo** - Prevent unnecessary re-renders of sections
3. **Lazy load charts** - Use React.lazy for heavy chart components
4. **Cache API responses** - Store in state or localStorage
5. **Optimize images** - Ensure no large assets

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Deployment Options

### Netlify
```bash
npm run build
# Drag-and-drop dist folder into Netlify
```

### Vercel
```bash
npm install -g vercel
vercel deploy
```

### AWS S3 + CloudFront
```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name
```

### Docker
Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Troubleshooting

**Dashboard looks broken?**
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console for errors
- Ensure Tailwind CSS is compiled (should be automatic with npm start)

**Charts not showing?**
- Check that Recharts is installed: `npm list recharts`
- Verify data structure matches mockData.js format

**API integration not working?**
- Check .env variables are set correctly
- Use console.log to debug API responses
- Verify CORS headers are correct
- Test API endpoints with Postman first

## Support & Questions

For questions about the dashboard, refer to:
- Recharts docs: https://recharts.org
- Tailwind CSS: https://tailwindcss.com
- React docs: https://react.dev

---

**Built with 🔥 for Southwest Energy** | BOSS MAN v1.0
