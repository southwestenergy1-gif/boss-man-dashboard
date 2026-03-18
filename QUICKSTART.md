# ⚡ BOSS MAN Quick Start

Get BOSS MAN running in **5 minutes**.

## Prerequisites

- Node.js 16+ installed ([download](https://nodejs.org))
- A code editor (VS Code recommended)
- A terminal/command line

## Installation (< 1 minute)

```bash
# Navigate to the project folder
cd boss-man-dashboard

# Install dependencies
npm install

# Start development server
npm start
```

**That's it!** Browser opens automatically at `http://localhost:5173`

## What You See

✨ **Cyberpunk dashboard with:**
- Big glowing "BOSS MAN" header
- 3 business tabs: Solar | Construction | Aqua Systems
- Real-time looking metrics and charts
- Mobile responsive design
- Smooth animations and neon accents

### Try These Interactions

1. **Click business tabs** at top (Solar → Construction → Aqua Systems)
   - All metrics update instantly
   - Colors change per business

2. **Hover over cards** - See glow effects

3. **Watch animated progress bars** - Revenue toward target

4. **Check mobile view** - Press F12 → toggle device toolbar (mobile responsive!)

## Mock Data

Dashboard comes with **realistic fake data** so you can see it in action:

- **Solar:** $50k/month revenue target, $120k pipeline, 15 new leads/week
- **Construction:** $40k/month revenue target, $85k pipeline, 8 new leads/week  
- **Aqua Systems:** $15k/month revenue target, $30k pipeline, 3 new leads/week

### Swap Mock Data (No Code Needed)

Edit `src/data/mockData.js` and change numbers:

```javascript
solar: {
  leads: {
    newThisWeek: 15,  // ← Change this
    trendPercent: 12,  // ← Or this
    pipelineValue: 120000,  // ← Or this
    // ...
  }
}
```

Save file → Dashboard updates instantly. No restart needed.

## Next Steps

### 1. Deploy Live (Choose One)

**Option A: Netlify (Easiest)**
```bash
npm run build
# Drag dist/ folder to https://netlify.com
# Live in 30 seconds!
```

**Option B: Vercel**
```bash
npm install -g vercel
vercel
# Live in 60 seconds!
```

**Option C: Your own server**
```bash
npm run build
# Upload dist/ folder to any web host
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed steps.

### 2. Add Real Data (Later)

When ready to connect to real APIs:

1. Read [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
2. Get API keys:
   - **GoHighLevel:** https://app.gohighlevel.com → Settings → API
   - **Facebook Ads:** https://business.facebook.com → Settings → Access Tokens
   - **QuickBooks:** https://developer.intuit.com
3. Copy service files from guide
4. Replace mock data with real API calls

**Estimated time:** 2-3 hours (depends on your APIs)

### 3. Customize Design

**Change business colors:**
```javascript
// src/data/mockData.js
solar: {
  color: "#00FF88", // Change to your color
  // ...
}
```

**Change metrics or sections:**
- Edit `src/components/sections/` files
- Add/remove charts
- Rename labels

**Add your logo:**
- Replace flame emoji in header with your logo
- Replace in `src/components/BossManDashboard.jsx`

## File Structure (What Does What?)

```
boss-man-dashboard/
├── src/
│   ├── components/           ← Dashboard UI pieces
│   │   ├── BossManDashboard.jsx    ← Main dashboard
│   │   ├── BusinessSelector.jsx    ← Tab buttons
│   │   └── sections/               ← Each metric section
│   ├── data/
│   │   └── mockData.js             ← Change numbers here!
│   ├── App.jsx                     ← Root component
│   └── index.css                   ← Styling
├── index.html                ← Website entry point
├── package.json              ← Dependencies list
├── vite.config.js            ← Build config
└── README.md                 ← Full documentation
```

## Common Changes

### Add a New Metric

In `src/components/BossManDashboard.jsx`:

```javascript
<QuickStatCard
  label="New Custom Metric"
  value={123}
  trend={15}
  unit="this week"
  color={businessMeta.color}
  icon={<Icon className="w-5 h-5" />}
/>
```

### Change Monthly Revenue Target

In `src/data/mockData.js`:

```javascript
solar: {
  accounting: {
    revenueTarget: 75000,  // Changed from 50000
    // ...
  }
}
```

### Update Lead Count

```javascript
solar: {
  leads: {
    newThisWeek: 25,  // Changed from 15
    // ...
  }
}
```

## Troubleshooting

**Dashboard not loading?**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
npm start
```

**"Port 5173 already in use"?**
```bash
# Kill process using that port or use different port
npm start -- --port 3000
```

**Styles look broken?**
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache

**Component not updating?**
- Check browser console for errors (F12)
- Make sure you saved the file
- Restart dev server

## Development Tips

### Enable Hot Reload
Changes to files auto-update browser:
- Edit `src/data/mockData.js` → Save
- Dashboard updates instantly (no reload!)

### Debug in Browser
Press F12 → Console tab
- See errors and warnings
- Use `console.log()` to debug

### Test on Phone
Same network as computer:
```bash
# Find your computer IP (shows in terminal when npm start)
# On phone: visit http://YOUR_IP:5173
```

## Ready for Production?

Checklist before going live:

- [ ] All three business views tested
- [ ] Metrics look correct
- [ ] Mobile view responsive
- [ ] No console errors
- [ ] API keys configured (if using real data)
- [ ] Run `npm run build` ✓
- [ ] Deploy to Netlify/Vercel

## API Integration Timeline

1. **Week 1:** Dashboard with mock data (you are here ✓)
2. **Week 2:** Add GoHighLevel API (leads)
3. **Week 3:** Add Facebook Ads API (marketing metrics)
4. **Week 4:** Add QuickBooks API (accounting)

Start with GoHighLevel (leads are most important). You don't need all APIs at once.

## Questions?

- **How to deploy?** → See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **How to add APIs?** → See [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
- **How to customize?** → See [README.md](./README.md)
- **Tech questions?** → See bottom of README.md for docs links

## Next Command to Run

```bash
npm start
```

Then open browser to **http://localhost:5173** and click around! 🚀

---

**That's BOSS MAN.** Professional operations dashboard, absolutely insane cyberpunk aesthetic. Ready for Christopher to build an empire. 🔥⚡
