# 🔧 Troubleshooting Guide

Common issues and their solutions when deploying QuoteMe.

---

## 🚫 Export Issues

### "I can't find the download/export button in Figma Make"

**Solutions:**
1. Look for these buttons/menus:
   - Three dots `...` in top-right
   - `File` menu
   - `Export` button
   - `Share` menu
   - `Download` option

2. Try keyboard shortcuts:
   - `Ctrl/Cmd + E` (Export)
   - `Ctrl/Cmd + S` (Save/Download)

3. Use manual copy method (see [EXPORT_GUIDE.md](EXPORT_GUIDE.md))

4. Check if Figma Make has GitHub integration instead

---

## 📦 Installation Issues

### "npm: command not found" or "node: command not found"

**Solution:** Install Node.js first
```bash
# Download from: https://nodejs.org
# Choose LTS version (recommended)
# After installing, restart your terminal
```

### "npm install" fails with errors

**Solution 1:** Use correct Node version
```bash
# Check your Node version
node --version

# Should be 18.x or higher
# If not, update Node.js
```

**Solution 2:** Clear cache and retry
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Solution 3:** Try pnpm instead
```bash
npm install -g pnpm
pnpm install
```

---

## 🏗️ Build Issues

### "vite: command not found" when running npm run build

**Solution:**
```bash
# Make sure dependencies are installed
npm install

# Try running with npx
npx vite build
```

### Build fails with TypeScript errors

**Solution:**
```bash
# Check if all source files exist
ls src/main.tsx
ls src/app/App.tsx

# If missing, check EXPORT_GUIDE.md
```

### "Cannot find module '@/...'" errors

**Solution:** The `@` alias is configured in `vite.config.ts` - make sure that file exists

---

## 🚀 Deployment Issues

### Vercel deployment fails

**Common fixes:**

1. **Missing index.html**
```bash
# Check if index.html exists in root
ls index.html
```

2. **Wrong build command**
   - Vercel should auto-detect Vite
   - If not, manually set:
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Node version mismatch**
   - Add to `package.json`:
   ```json
   "engines": {
     "node": "18.x"
   }
   ```

### Netlify deployment fails

**Common fixes:**

1. **Check netlify.toml exists**
```bash
ls netlify.toml
```

2. **Manually configure:**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Add redirect rules** (already in netlify.toml and public/_redirects)

---

## 🌐 Routing Issues

### "404 Not Found" when refreshing page or accessing routes directly

**Solutions:**

**For Vercel:**
- `vercel.json` should handle this (already configured)
- If still broken, check that file exists

**For Netlify:**
- Check `netlify.toml` exists
- Or check `public/_redirects` exists

**For other platforms:**
```
Add redirect rule: /* → /index.html (200)
```

### Landing page loads but dashboard gives 404

**Solution:** Check routes configuration
```bash
# Verify these routes exist in src/app/routes.tsx
cat src/app/routes.tsx | grep -A 5 "dashboard"
```

---

## 🔌 API Connection Issues

### "Failed to fetch" or CORS errors

**Possible causes:**

1. **Backend not running**
   - Check: https://web-production-9f6e9.up.railway.app
   - Should respond (might show error page, but should load)

2. **CORS not configured on backend**
   - Backend needs to allow your frontend domain
   - Check Railway backend CORS settings

3. **Wrong API URL**
   - Check `src/app/services/api.ts`
   - Should be: `https://web-production-9f6e9.up.railway.app`

**Quick test:**
```bash
# Test if API is accessible
curl https://web-production-9f6e9.up.railway.app/api/v1/guest/sessions
```

### Authentication not working

**Check these:**

1. **Token storage**
   - Open browser DevTools → Application → Local Storage
   - Should see `quoteme_token` or `quoteme_guest_token`

2. **Token format**
   - Should be sent as: `Authorization: Bearer <token>`
   - Check Network tab in DevTools

3. **Backend JWT validation**
   - Token might be expired
   - Try logging out and back in

---

## 📱 UI/UX Issues

### Mobile menu/sidebar not working

**Solution:** 
- Clear browser cache
- Check if JavaScript is enabled
- Try in incognito/private mode

### Styles not loading or look broken

**Solution:**
```bash
# Rebuild styles
rm -rf dist
npm run build

# Check if Tailwind CSS files exist
ls src/styles/tailwind.css
ls src/styles/theme.css
```

### Images not loading

**Solution:**
- Check if using `ImageWithFallback` component
- Check if `figma:asset` imports work (Figma Make specific)
- Replace with regular img tags if deploying outside Figma Make

---

## 🎨 Styling Issues

### Fonts not loading

**Solution:**
```bash
# Check fonts.css exists
cat src/styles/fonts.css

# Make sure it's imported in index.css
cat src/styles/index.css | grep fonts
```

### Colors don't match design

**Solution:** Check brand colors in `src/styles/theme.css`:
- Primary: `#F2993D`
- Secondary: `#A5CFDD`
- Background: `#FFF9F3`

---

## 🔐 Auth Context Errors

### "useAuth must be used within an AuthProvider"

**Solution:** This is fixed! But if you still see it:

1. **Check provider structure:**
```bash
# Verify RootWrapper includes providers
cat src/app/components/RootWrapper.tsx
```

2. **Check routes.tsx:**
```bash
# RootWrapper should wrap all routes
cat src/app/routes.tsx | grep RootWrapper
```

---

## 💾 LocalStorage Issues

### "localStorage is not defined"

**Solution:** This happens during SSR or in tests
- The app is client-side only (Vite)
- If you're trying to make it SSR, you'll need to wrap localStorage calls

### Guest session not persisting

**Solution:**
```javascript
// Check if localStorage is working
localStorage.setItem('test', 'value')
localStorage.getItem('test') // Should return 'value'

// Clear and retry
localStorage.clear()
```

---

## 🐛 Other Common Errors

### "Hydration mismatch" errors

**This shouldn't happen** (not using SSR), but if it does:
- Clear browser cache
- Check for duplicate IDs in HTML
- Restart dev server

### "Module not found" errors

**Solution:**
```bash
# Reinstall dependencies
npm ci

# Or
rm -rf node_modules
npm install
```

### TypeScript errors in production

**Solution:**
```bash
# Make sure TypeScript is happy
npx tsc --noEmit

# If errors, fix them before deploying
```

---

## 🆘 Still Stuck?

1. **Check logs:**
   - Browser DevTools Console (F12)
   - Vercel/Netlify deployment logs
   - Terminal error messages

2. **Compare with working version:**
   - Re-download from Figma Make
   - Check against this guide

3. **Start fresh:**
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

4. **Check documentation:**
   - [EXPORT_GUIDE.md](EXPORT_GUIDE.md) - Export help
   - [QUICKSTART.md](QUICKSTART.md) - Deployment steps
   - [DEPLOYMENT.md](DEPLOYMENT.md) - Full docs

---

## 📝 Report Issues

If you find a bug or issue not covered here:

1. Check the browser console (F12)
2. Check deployment logs
3. Note the exact error message
4. Document steps to reproduce
5. Check if Railway backend is accessible

---

**Most issues are solved by:** `rm -rf node_modules && npm install && npm run build` 🔄
