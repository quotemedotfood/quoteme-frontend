# 🚀 Quick Start Guide

## Export from Figma Make

### Method 1: Download Project (Easiest)
1. Click the **"..."** menu in the top-right corner of Figma Make
2. Select **"Download project"** or **"Export"**
3. Save the ZIP file to your computer
4. Extract it to a folder

### Method 2: Use Figma Make's Export Feature
Some Figma Make versions have a direct "Export to GitHub" or "Deploy" button - check your interface!

---

## Deploy to Vercel in 3 Steps

### Step 1: Prepare Your Code

**Option A: Via GitHub (Recommended)**
```bash
# Navigate to your project folder
cd path/to/your/project

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: QuoteMe app"

# Create a new repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/quoteme.git
git push -u origin main
```

**Option B: Direct Deploy (No GitHub)**
Skip to Step 2 and use Vercel CLI

---

### Step 2: Deploy to Vercel

**Option A: Via GitHub (Best for continuous deployment)**
1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect settings
6. Click **"Deploy"**
7. Done! 🎉

**Option B: Via Vercel CLI (Quick one-time deploy)**
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# For production
vercel --prod
```

---

### Step 3: Your App is Live! 🎉

Vercel will give you a URL like:
```
https://quoteme-abc123.vercel.app
```

Share it with your team and start using QuoteMe!

---

## Alternative: Deploy to Netlify

### Via Netlify Drop (Easiest)
1. Build your project locally:
   ```bash
   npm install
   npm run build
   ```
2. Go to https://app.netlify.com/drop
3. Drag and drop the `dist` folder
4. Done! 🎉

### Via Netlify CLI
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## Troubleshooting

### "Command not found: vite" or build errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### "React is not defined"
Make sure `/src/main.tsx` and `/index.html` exist (they should be created automatically)

### Routing doesn't work on deployed site
The `vercel.json` file handles this. If using another platform:
- Netlify: Add `_redirects` file with `/* /index.html 200`
- Railway: Add `nixpacks.toml` with SPA config

### API not connecting
The app connects to: `https://web-production-9f6e9.up.railway.app`
- Ensure this backend is running
- Check CORS settings on the backend
- Open browser console to see error messages

---

## Need Help?

Check the full `DEPLOYMENT.md` file for:
- Local development setup
- Environment variables
- Custom domain setup
- CI/CD configuration
- API documentation

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel
vercel --prod

# Deploy to Netlify
netlify deploy --prod
```

---

**Your app is now ready to deploy! 🚀**
