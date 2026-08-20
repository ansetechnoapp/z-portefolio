# External Portfolio - Powered by Zodback

A beautiful, modern portfolio template that fetches data from your Zodback dashboard. This standalone HTML/CSS/JS portfolio can be deployed to any static hosting platform.

## ✨ Features

- **Modern Design**: Clean, professional design with smooth animations
- **Fully Responsive**: Works perfectly on all devices
- **Dynamic Content**: Fetches your portfolio data from Zodback API
- **Automatic GitHub Profile**: Derives the public GitHub profile and repositories from ZodBack
- **Fast Loading**: Optimized for performance with caching
- **Easy Customization**: Simple configuration file
- **SEO Friendly**: Semantic HTML structure
- **Accessible**: Follows accessibility best practices

## 🚀 Quick Start

### 1. Public Showcase Source

The public site `portfolio.zodev.live` reads directly from the Zodback portfolio showcase configured in `js/config.js`. No browser token is required for the live site. The showcase discriminates template and manual publications with `data.renderMode`. Manual Composition documents are rendered through a strict `core.*` DOM allowlist; remote values are never interpreted as HTML, CSS, or JavaScript. If the publication cannot be verified, the site shows an explicit unavailable state and never falls back to demo content.

### 2. Configure Your Portfolio

Open `js/config.js` and update the following:

```javascript
const PORTFOLIO_CONFIG = {
    API_URL: 'https://integrations-api.zodev.live/api/portfolio',
    SHOWCASE_SLUG: 'kowin-city',
    CACHE_DURATION: 300000,
};
```

### 3. Add Your Content

Use the Zodback dashboard to manage your portfolio content:

- **Dashboard > Portfolio > Projects**: Add your work projects
- **Dashboard > Portfolio > Skills**: List your technical skills
- **Dashboard > Portfolio > Experiences**: Add your work history
- **Dashboard > Portfolio > Testimonials**: Include client reviews

### GitHub Profile Configuration

Set the public GitHub link in the ZodBack portfolio profile (`profile.socialLinks.github`) using `https://github.com/<username>` (the `https://www.github.com/<username>` host is also accepted). Raw usernames, `@username`, HTTP links, repository links, and URLs with additional path segments are rejected. The GitHub navigation link and section remain hidden, with no GitHub request, until this URL has been validated after the ZodBack showcase loads. No GitHub token or secret is stored in the browser.

The GitHub panel reads the public profile first, then requests up to 30 owner repositories from `api.github.com`. It never requests repositories if the profile lookup fails. Forks, archived repositories, and disabled repositories are hidden; the remaining projects are ordered by their latest push (falling back to their update date and name) and displayed in batches of 6.

Successful responses are cached in browser storage for 15 minutes. For transient network, timeout, rate-limit, or server errors, the latest valid response can remain visible for up to 24 hours with a stale-data notice. Definitive errors such as an invalid source or a missing profile never use stale data. Invalid or corrupted cache entries are discarded automatically. Requests time out after 10 seconds; retry remains manual, and a rate-limit retry button stays disabled until GitHub's announced retry time.

### 4. Deploy

Deploy to any static hosting service:

#### Netlify
```bash
# Drag and drop the folder to Netlify
# Or use CLI:
npm install -g netlify-cli
netlify deploy --prod
```

#### Vercel
```bash
npm install -g vercel
vercel --prod
```

#### GitHub Pages
1. Push to GitHub
2. Go to Settings > Pages
3. Select branch and save

#### Simple HTTP Server (Local Testing)
```bash
# Python 3
python -m http.server 8080

# Node.js
npx serve
```

## 📁 Project Structure

```
portefolio/
├── index.html          # Main HTML file (Default template)
├── css/
│   ├── style.css       # Main styles
│   └── animations.css  # Animation utilities
├── js/
│   ├── config.js       # Configuration (API credentials)
│   ├── api.js          # API client
│   └── app.js          # Main application logic
├── templates/
│   ├── creative/       # Colorful, animated template
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── animations.css
│   │   └── app.js
│   └── professional/   # Clean corporate template
│       ├── index.html
│       ├── style.css
│       └── app.js
└── README.md           # This file
```

## 🎭 Available Templates

Choose from 3 beautiful templates:

### 1. Default (Modern Dark)
The main `index.html` - A sleek dark theme with purple gradients and smooth animations.
- Dark background with glassmorphism effects
- Purple/violet accent colors
- Subtle grid patterns and glows

### 2. Creative (Colorful)
Location: `templates/creative/index.html`
- Vibrant gradient colors (red, yellow, blue, pink)
- Animated floating shapes and blobs
- Cursor follower effect
- Playful micro-interactions

### 3. Professional (Corporate Light)
Location: `templates/professional/index.html`
- Clean light theme with navy accents
- Elegant serif/sans-serif typography
- Contact form included
- Business-focused layout

### Switching Templates

To use a different template:
1. Open the desired template folder
2. Copy all files to your deployment root
3. Make sure `js/config.js` path is correct in the HTML

## 🎨 Customization

### Colors

Edit the CSS variables in `css/style.css`:

```css
:root {
    --color-accent-primary: #6366f1;    /* Main accent color */
    --color-accent-secondary: #8b5cf6;  /* Secondary accent */
    --color-bg-primary: #0a0a0f;        /* Background */
    /* ... more variables */
}
```

### Fonts

The portfolio uses Google Fonts (Inter and Outfit). To change:

1. Update the font link in `index.html`
2. Update `--font-primary` and `--font-display` in CSS

### Sections

Each section can be customized in `index.html`. The main sections are:
- Hero
- About
- Skills
- Experience
- Projects
- Testimonials
- Contact

## 🔧 API Endpoints Used

The public portfolio uses this Zodback API endpoint:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/portfolio/showcase/site/:slug` | GET | Public showcase data for the live portfolio |

For `renderMode=manual`, the payload contains the validated published revision
under `data.composition`. The browser creates elements with `createElement` and
assigns remote copy with `textContent`; it does not use `innerHTML` or accept
remote class/style values. Until a Storage resolver is enabled, `core.image`
is displayed explicitly as an unresolved Storage reference.

### Authentication

The live site does not send a browser token. The showcase endpoint is public and already scoped to the portfolio site. Tokenized portfolio endpoints remain available for internal workflows, but this template no longer depends on them.

### GitHub Public API

When `profile.socialLinks.github` is configured, the page calls GitHub's public `GET /users/:username` and `GET /users/:username/repos` endpoints directly. These anonymous requests are subject to GitHub's public rate limit; the cache and stale-if-error behavior above reduce unnecessary calls.

## 🐛 Troubleshooting

### Portfolio shows "No data"

1. Check that `SHOWCASE_SLUG` is correct in `js/config.js`
2. Verify the portfolio showcase is published in ZodBack and that its slug is the published site slug, not the project slug
3. Check browser console for errors
4. Ensure CORS is enabled for `portfolio.zodev.live`

### CORS Errors

If you see CORS errors:
1. Ensure your Zodback backend allows your portfolio domain
2. Add `PORTFOLIO_ORIGIN=https://your-portfolio.com` to backend `.env`

### GitHub panel is unavailable

1. Confirm the ZodBack social link uses `https://github.com/<username>` and points to a user profile, not a repository or organization route
2. If the panel reports a rate limit, wait until the displayed retry time or let the cached data remain visible
3. Use the retry button for temporary network or timeout errors

## 📝 License

This portfolio template is provided as part of the Zodback ecosystem. Feel free to customize and use for your personal or commercial projects.

---

Made with ❤️ and powered by [Zodback](https://zodback.com)
