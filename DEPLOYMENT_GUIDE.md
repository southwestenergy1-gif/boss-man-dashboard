# 🚀 BOSS MAN Deployment Guide

Complete guide to deploying BOSS MAN to production environments.

## Pre-Deployment Checklist

- [ ] Test all three business views (Solar, Construction, Aqua Systems)
- [ ] Verify all charts render correctly
- [ ] Test on mobile device (iPhone, Android)
- [ ] Test on tablet
- [ ] Check all buttons and interactive elements work
- [ ] Run `npm run build` locally and test dist folder
- [ ] Update `.env` with production values
- [ ] Clear any console.log statements in production code

## Deployment Methods

### Option 1: Netlify (Recommended - Easiest)

**Pros:** Free tier, automatic builds, instant deployments, SSL included

1. **Connect GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial BOSS MAN commit"
   git push origin main
   ```

2. **Create Netlify Account**
   - Go to https://netlify.com
   - Sign up with GitHub
   - Click "New site from Git"

3. **Configure Build**
   - Repository: Select boss-man-dashboard
   - Branch: main
   - Build command: `npm run build`
   - Publish directory: `dist`

4. **Set Environment Variables**
   - Go to Site Settings → Build & Deploy → Environment
   - Add your API keys:
     ```
     REACT_APP_GHL_API_KEY=pit-xxxxx
     REACT_APP_GHL_LOCATION_ID=8lhNwDfFaYq79D0gGjCE
     REACT_APP_FACEBOOK_ACCESS_TOKEN=EAAmWwtxHLNIBQx4...
     REACT_APP_FACEBOOK_AD_ACCOUNT_ID=558964757978719
     ```

5. **Deploy**
   - Just push to main branch
   - Netlify auto-deploys on every commit
   - Your site URL: `https://your-site-name.netlify.app`

**Add Custom Domain:**
- Settings → Domain Management → Custom Domain
- Follow DNS setup instructions

---

### Option 2: Vercel

**Pros:** Fast CDN, auto-scaling, Next.js optimized

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```
   Follow the prompts to connect your account.

3. **Set Environment Variables**
   ```bash
   vercel env add REACT_APP_GHL_API_KEY
   vercel env add REACT_APP_GHL_LOCATION_ID
   vercel env add REACT_APP_FACEBOOK_ACCESS_TOKEN
   vercel env add REACT_APP_FACEBOOK_AD_ACCOUNT_ID
   ```

4. **Redeploy with env vars**
   ```bash
   vercel --prod
   ```

---

### Option 3: AWS S3 + CloudFront

**Pros:** Scalable, CDN, enterprise-ready

1. **Build Project**
   ```bash
   npm run build
   ```

2. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://boss-man-dashboard
   ```

3. **Upload Files**
   ```bash
   aws s3 sync dist/ s3://boss-man-dashboard --acl public-read
   ```

4. **Enable Static Website Hosting**
   - S3 Console → Bucket → Properties
   - Static website hosting → Enable
   - Index: `index.html`
   - Error: `index.html` (for React routing)

5. **Create CloudFront Distribution**
   - CloudFront Console → Create distribution
   - Origin: Your S3 bucket
   - Enable HTTPS
   - Default root object: `index.html`
   - Custom error response:
     - 404 → /index.html

6. **Setup Auto-Deployments**
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to AWS S3
   on:
     push:
       branches: [main]
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: 18
         - run: npm ci && npm run build
         - uses: aws-actions/configure-aws-credentials@v2
           with:
             aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
             aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
             aws-region: us-east-1
         - run: aws s3 sync dist/ s3://boss-man-dashboard --delete
         - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
   ```

---

### Option 4: Docker + Your Own Server

**Pros:** Full control, can run anywhere

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine as builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM node:18-alpine
   WORKDIR /app
   RUN npm install -g serve
   COPY --from=builder /app/dist ./dist
   EXPOSE 3000
   CMD ["serve", "-s", "dist", "-l", "3000"]
   ```

2. **Build Image**
   ```bash
   docker build -t boss-man-dashboard .
   ```

3. **Run Container**
   ```bash
   docker run -p 3000:3000 boss-man-dashboard
   ```

4. **Push to Docker Hub**
   ```bash
   docker tag boss-man-dashboard yourusername/boss-man-dashboard
   docker push yourusername/boss-man-dashboard
   ```

5. **Deploy with Docker Compose**
   ```yaml
   version: '3.8'
   services:
     boss-man:
       image: yourusername/boss-man-dashboard
       ports:
         - "3000:3000"
       environment:
         - REACT_APP_GHL_API_KEY=${GHL_API_KEY}
         - REACT_APP_GHL_LOCATION_ID=${GHL_LOCATION_ID}
         - REACT_APP_FACEBOOK_ACCESS_TOKEN=${FB_TOKEN}
       restart: unless-stopped
   ```

---

## Production Optimization

### Performance

1. **Enable Gzip Compression**
   - Netlify/Vercel: Automatic
   - AWS S3: Enable gzip in CloudFront
   - Custom server: Configure in nginx/Apache

2. **Enable Browser Caching**
   - Set Cache-Control headers for assets
   ```
   Cache-Control: public, max-age=31536000 (for /js, /css)
   Cache-Control: no-cache (for index.html)
   ```

3. **Minify Assets**
   - Already done with `npm run build`
   - Check dist folder for minified files

4. **Code Splitting**
   - Vite does this automatically
   - Lazy-load heavy components with React.lazy

### Security

1. **Add Security Headers**
   ```
   Content-Security-Policy: default-src 'self'
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   X-XSS-Protection: 1; mode=block
   Strict-Transport-Security: max-age=31536000
   ```

2. **Environment Variables**
   - Never commit `.env` file
   - Use secrets management system
   - Rotate API keys regularly

3. **HTTPS Only**
   - Enable on all deployment platforms
   - Use SSL certificates (free with Let's Encrypt)

4. **Protect API Keys**
   - Keep API calls server-side if possible
   - Use API Gateway/Lambda for requests
   - Never expose keys in client code

### Monitoring

1. **Set Up Error Tracking**
   - Sentry: https://sentry.io
   - Rollbar: https://rollbar.com
   - LogRocket: https://logrocket.com

2. **Monitor Performance**
   - Google Analytics
   - Netlify Analytics
   - New Relic

3. **Uptime Monitoring**
   - Pingdom: https://pingdom.com
   - UptimeRobot: https://uptimerobot.com
   - Better Uptime: https://betteruptime.com

Example Sentry integration:
```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://xxxxx@xxxxx.ingest.sentry.io/xxxxx",
  environment: "production",
  tracesSampleRate: 0.1,
});

export default Sentry.withProfiler(App);
```

## Continuous Deployment

### GitHub Actions (Auto-Deploy on Push)

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install Dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Netlify
        uses: nflx-actions/netlify-action@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --dir=dist --prod
```

## Post-Deployment

1. **Test Live Dashboard**
   - Visit production URL
   - Switch between business tabs
   - Verify all charts load
   - Test on mobile device

2. **Monitor Performance**
   - Check Page Speed Insights
   - Monitor error logs
   - Watch API response times

3. **Set Up Alerts**
   - Deploy notifications
   - Error alerts
   - Uptime alerts

4. **Document Deployment**
   - Record deployment date
   - Note any issues
   - Document access methods

## Rollback Plan

If something breaks in production:

1. **Netlify Rollback**
   ```
   Netlify UI → Deploys → Select previous version → Publish
   ```

2. **GitHub Rollback**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Manual Rollback**
   - Keep previous `dist` folder backup
   - Re-upload old version to S3/server

## Performance Benchmarks

Target metrics for production:

- **First Contentful Paint (FCP):** < 1.5s
- **Largest Contentful Paint (LCP):** < 2.5s
- **Cumulative Layout Shift (CLS):** < 0.1
- **Time to Interactive (TTI):** < 3.5s
- **Bundle Size:** < 250KB (gzipped)

Test with:
```bash
npm install -g lighthouse
lighthouse https://your-domain.com --view
```

## Support & Troubleshooting

**Deployment shows blank page?**
- Check browser console (F12)
- Verify API keys are set
- Check build output (dist/index.html exists)

**Charts not loading?**
- Check Network tab for failed requests
- Verify Recharts package installed
- Check for CORS errors

**Slow performance?**
- Enable Gzip compression
- Add CDN caching
- Reduce API call frequency
- Use browser caching

---

**Questions?** See README.md or check the API Integration Guide.
