# 🌐 External Portfolio - Deployment Guide

This folder contains your **standalone portfolio** that can be deployed anywhere.

---

## 📦 What's Inside

```
portefolio/
├── index.html              # Main portfolio page
├── css/
│   ├── style.css          # Core styles
│   └── animations.css     # Smooth transitions
├── js/
│   ├── config.js          # ⚙️ YOUR CONFIGURATION
│   ├── api.js             # API client (handles data fetching)
│   └── app.js             # Main application logic
├── templates/
│   ├── creative/          # Colorful vibrant template
│   └── professional/      # Clean corporate template
└── export/                # Static exports (optional)
```

---

## ⚡ Quick Deploy

### **Before Deploying: Configure Your API**

1. **Get your API token** from Zodback dashboard
2. **Open** `js/config.js`
3. **Update:**
   ```javascript
   const PORTFOLIO_CONFIG = {
       API_URL: 'https://your-api.zodback.com/api',  // Your production API
       API_TOKEN: 'zb_your_token_here',              // Your real token
       PROJECT_ID: '1',
   };
   ```

---

## 🚀 Deployment Options

### **1. Netlify (Recommended - 1 minute)**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

**Manual Deploy:**
1. Go to [netlify.com](https://netlify.com)
2. Drag & drop this folder
3. Done! 🎉

**Your portfolio will be live at:** `https://your-name.netlify.app`

---

### **2. Vercel (Also Great)**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

**Or use Vercel Dashboard:**
1. Go to [vercel.com](https://vercel.com)
2. Import this folder
3. Deploy! 🚀

---

### **3. GitHub Pages (Free)**

**Option A - Automated:**
```bash
# Create gh-pages branch
git checkout -b gh-pages
git add .
git commit -m "Deploy portfolio"
git push origin gh-pages
```

Enable in GitHub repository settings → Pages → Source: `gh-pages` branch

**Your site:** `https://username.github.io/portfolio`

---

**Option B - Use `/docs` folder:**

1. Copy this folder to `/docs` in your repo root
2. Push to GitHub
3. Enable Pages with source: `main` branch, `/docs` folder

---

### **4. Cloudflare Pages**

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your Git repository
3. Set build settings:
   - Build command: (none)
   - Output directory: `.`
4. Deploy! ⚡

**Bonus:** Cloudflare CDN gives you global edge caching!

---

### **5. Firebase Hosting**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Deploy
firebase deploy
```

---

### **6. AWS S3 + CloudFront**

```bash
# Install AWS CLI
# Configure: aws configure

# Create bucket
aws s3 mb s3://my-portfolio

# Upload files
aws s3 sync . s3://my-portfolio --acl public-read

# Enable static website hosting
aws s3 website s3://my-portfolio --index-document index.html
```

**Optional:** Add CloudFront for CDN and HTTPS

---

### **7. Traditional Hosting (cPanel, FTP)**

**Any web host works!** Just upload via FTP:

1. Connect to your hosting via FTP
2. Upload all files to `public_html/` or `www/`
3. Visit your domain!

**Compatible with:**
- Hostinger
- Bluehost
- GoDaddy
- SiteGround
- Any PHP/Apache/Nginx host

---

## 🔒 Security for Production

### **⚠️ IMPORTANT: Protect Your API Token**

**Don't expose your token in client-side code for production!**

### **Recommended: Use a Proxy**

Create a serverless function to hide your token:

#### **Netlify Function**

Create `netlify/functions/portfolio.js`:
```javascript
exports.handler = async function(event, context) {
  const response = await fetch('https://api.zodback.com/portfolio/v1/public/all', {
    headers: {
      'Authorization': `Bearer ${process.env.PORTFOLIO_API_TOKEN}`,
      'X-Project-Id': process.env.PROJECT_ID
    }
  });

  const data = await response.json();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(data)
  };
};
```

Then set environment variables in Netlify dashboard:
- `PORTFOLIO_API_TOKEN` = your token
- `PROJECT_ID` = your project ID

Update `js/config.js`:
```javascript
API_URL: '/.netlify/functions/portfolio',
API_TOKEN: '',  // Not needed anymore!
```

---

#### **Vercel Function**

Create `api/portfolio.js`:
```javascript
export default async function handler(req, res) {
  const response = await fetch('https://api.zodback.com/portfolio/v1/public/all', {
    headers: {
      'Authorization': `Bearer ${process.env.PORTFOLIO_API_TOKEN}`,
      'X-Project-Id': process.env.PROJECT_ID
    }
  });

  const data = await response.json();
  res.json(data);
}
```

Add to `vercel.json`:
```json
{
  "env": {
    "PORTFOLIO_API_TOKEN": "@portfolio-token",
    "PROJECT_ID": "@project-id"
  }
}
```

---

## 🎨 Customization

### **Change Template**

Edit `js/config.js`:
```javascript
TEMPLATE: 'creative',  // or 'professional', 'default'
```

### **Custom Domain**

Most hosting providers allow custom domains:

1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Add DNS records:**
   - A record: points to hosting IP
   - Or CNAME: points to hosting domain
3. **Enable HTTPS** (usually automatic with Let's Encrypt)

**Examples:**
- Netlify: Automatic HTTPS with custom domain
- Vercel: Add domain in settings
- GitHub Pages: Add CNAME file with your domain

---

## ✅ Pre-Deploy Checklist

Before deploying, make sure:

- [ ] **API_URL** points to production API (not localhost!)
- [ ] **API_TOKEN** is valid and not expired
- [ ] **PROJECT_ID** matches your project
- [ ] Tested locally and data loads correctly
- [ ] No console errors in browser
- [ ] All images and assets load
- [ ] Mobile responsive (test on phone)
- [ ] SEO: Update meta tags in `index.html`
- [ ] Analytics added (optional)

---

## 🧪 Test Your Deployment

After deploying, verify:

```bash
# Test API endpoint
curl https://your-portfolio.com

# Check headers
curl -I https://your-portfolio.com

# Test API data loading
# Open browser dev tools → Network tab
# Refresh page → Check API call
```

**Expected behavior:**
- ✅ Page loads in < 2 seconds
- ✅ API request succeeds (200 status)
- ✅ Data populates correctly
- ✅ Images load
- ✅ No 404 errors

---

## 📊 Performance Tips

### **1. Enable Caching**

```javascript
// In config.js
CACHE_DURATION: 15 * 60 * 1000,  // 15 minutes
```

### **2. Use CDN**

Most modern hosts include CDN automatically:
- Netlify: Edge network included
- Vercel: Global edge network
- Cloudflare: Built-in CDN
- GitHub Pages: CDN via Fastly

### **3. Optimize Images**

Before deploying, compress images:
```bash
# Use tools like:
# - TinyPNG (tinypng.com)
# - ImageOptim
# - Squoosh (squoosh.app)
```

### **4. Lazy Loading**

Images automatically lazy load in modern browsers. No action needed!

---

## 🔍 SEO Optimization

### **Update Meta Tags**

Edit `index.html`:
```html
<title>Your Name - Portfolio | Full-Stack Developer</title>
<meta name="description" content="Portfolio of Your Name, specializing in...">
<meta name="keywords" content="portfolio, web developer, react, node.js">
<meta name="author" content="Your Name">

<!-- Open Graph (for social sharing) -->
<meta property="og:title" content="Your Name - Portfolio">
<meta property="og:description" content="Check out my portfolio...">
<meta property="og:image" content="https://your-site.com/preview.png">
<meta property="og:url" content="https://your-site.com">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Your Name - Portfolio">
<meta name="twitter:description" content="Full-Stack Developer Portfolio">
<meta name="twitter:image" content="https://your-site.com/preview.png">
```

### **Add Analytics (Optional)**

**Google Analytics:**
```html
<!-- Add before </head> -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

---

## 🆘 Troubleshooting

### **Issue: 404 on deployment**

**Solution:** Ensure `index.html` is in the root of the deployed folder.

### **Issue: API not loading**

1. Check `API_URL` is correct (production URL, not localhost)
2. Verify token is valid
3. Check browser console for CORS errors
4. Test API endpoint directly: `https://your-api.com/portfolio/v1/public/all`

### **Issue: Slow loading**

1. Enable caching in config
2. Optimize images
3. Use CDN-enabled hosting (Netlify, Vercel, Cloudflare)

---

## 🎯 What's Next?

After deployment:

1. **Share your portfolio!** 📢
   - LinkedIn
   - Twitter
   - Resume
   - GitHub profile

2. **Monitor performance** 📊
   - Use Google Analytics
   - Check PageSpeed Insights
   - Monitor uptime

3. **Keep it updated** 🔄
   - Add new projects in dashboard
   - Data auto-updates via API
   - No redeployment needed!

4. **Custom domain** 🌐
   - Looks more professional
   - Better for SEO
   - Easier to remember

---

## 📚 Resources

- [Zodback Portfolio Guide](../PORTFOLIO_SYSTEM_GUIDE.md)
- [Quick Start Guide](../PORTFOLIO_QUICK_START.md)
- [Netlify Docs](https://docs.netlify.com)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Pages Docs](https://pages.github.com)

---

**🚀 Ready to deploy? Pick a platform above and launch in minutes!**

Questions? Check the main [Portfolio System Guide](../PORTFOLIO_SYSTEM_GUIDE.md) or reach out for support.

---

Built with Zodback ⚡
