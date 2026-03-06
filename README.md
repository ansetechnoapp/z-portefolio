# External Portfolio - Powered by Zodback

A beautiful, modern portfolio template that fetches data from your Zodback dashboard. This standalone HTML/CSS/JS portfolio can be deployed to any static hosting platform.

## ✨ Features

- **Modern Design**: Clean, professional design with smooth animations
- **Fully Responsive**: Works perfectly on all devices
- **Dynamic Content**: Fetches your portfolio data from Zodback API
- **Fast Loading**: Optimized for performance with caching
- **Easy Customization**: Simple configuration file
- **SEO Friendly**: Semantic HTML structure
- **Accessible**: Follows accessibility best practices

## 🚀 Quick Start

### 1. Get Your API Token

1. Log in to your Zodback dashboard
2. Navigate to **Dashboard > API Tokens**
3. Click **"Generate New Token"**
4. Select the **PORTFOLIO** entity with **READ** permission
5. Copy the generated token

### 2. Configure Your Portfolio

Open `js/config.js` and update the following:

```javascript
const PORTFOLIO_CONFIG = {
    // Your Zodback API URL
    API_URL: 'https://your-zodback-api.com/api',
    
    // Your API Token (from step 1)
    API_TOKEN: 'tok_your_token_here',
    
    // Your Project ID (find in Dashboard > Projects)
    PROJECT_ID: 'your_project_id',
    
    // Your personal information
    OWNER: {
        name: 'Your Name',
        role: 'Your Role',
        email: 'your@email.com',
        // ... other details
    }
};
```

### 3. Add Your Content

Use the Zodback dashboard to manage your portfolio content:

- **Dashboard > Portfolio > Projects**: Add your work projects
- **Dashboard > Portfolio > Skills**: List your technical skills
- **Dashboard > Portfolio > Experiences**: Add your work history
- **Dashboard > Portfolio > Testimonials**: Include client reviews

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

The portfolio uses these Zodback API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/portfolio/v1/public/all` | GET | Fetch all data at once |
| `/portfolio/v1/public/projects` | GET | Projects only |
| `/portfolio/v1/public/skills` | GET | Skills only |
| `/portfolio/v1/public/experiences` | GET | Experiences only |
| `/portfolio/v1/public/testimonials` | GET | Testimonials only |

### Authentication

All requests require:
```
Authorization: Bearer <your_api_token>
```

Or using header:
```
X-API-Key: <your_api_token>
```

If your token is project-scoped, no additional header is needed. Otherwise, include:
```
X-Project-Id: <your_project_id>
```

## 🐛 Troubleshooting

### Portfolio shows "No data"

1. Check if API token is correctly configured in `config.js`
2. Verify the token has PORTFOLIO entity access
3. Check browser console for errors
4. Ensure CORS is enabled on your Zodback backend

### CORS Errors

If you see CORS errors:
1. Ensure your Zodback backend allows your portfolio domain
2. Add `PORTFOLIO_ORIGIN=https://your-portfolio.com` to backend `.env`

### Demo Mode

If no API token is configured, the portfolio displays demo data. This is useful for:
- Testing the design
- Development
- Showcasing the template

## 📝 License

This portfolio template is provided as part of the Zodback ecosystem. Feel free to customize and use for your personal or commercial projects.

---

Made with ❤️ and powered by [Zodback](https://zodback.com)
