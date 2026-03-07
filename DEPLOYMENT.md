# QuoteMe - Food Distributor Quote Management System

A multi-page food distributor/restaurant management application built with React, TypeScript, and Tailwind CSS. Features guest-first onboarding, JWT authentication, and a trial system with 5 free quotes.

## 🚀 Features

- **4 Main Pages**: Customers, QuoteME Dashboard, Start New Quote, Quote Builder
- **Guest-First Flow**: Jump right in without login, authenticate when sending quotes
- **JWT Authentication**: Custom auth via Railway API
- **Trial System**: 5 free quotes for guests, upgrade prompts for premium
- **Mobile Optimized**: Card views, bottom sheets, swipe gestures
- **Brand Colors**: #F2993D, #A5CFDD, #FFF9F3, #2A2A2A, #4F4F4F

## 📦 Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router 7** for routing
- **Tailwind CSS v4** for styling
- **Railway API** for backend services
- **Radix UI** for accessible components
- **Lucide React** for icons

## 🏗️ Project Structure

```
/src
  /app
    /components      # Reusable UI components
    /contexts        # Auth & User context providers
    /pages           # Main application pages
    /services        # API service layer
  /styles           # Global styles and theme
```

## 🌐 API Integration

Backend URL: `https://web-production-9f6e9.up.railway.app`

### Authentication
- `POST /users/sign_in` - User login
- `POST /users` - User signup
- `GET /api/v1/me` - Get current user

### Guest Mode
- `POST /api/v1/guest/sessions` - Create guest session
- `GET /api/v1/guest/sessions/:token` - Get guest status
- `POST /api/v1/guest/quotes` - Create guest quote
- `POST /api/v1/guest/convert` - Convert guest to user

### Quotes & Catalogs (Authenticated)
- `POST /api/v1/menus` - Upload menu
- `GET /api/v1/menus/:id` - Get menu
- `POST /api/v1/quotes` - Create quote
- `GET /api/v1/quotes/:id` - Get quote
- `PATCH /api/v1/quotes/:id` - Update quote
- `POST /api/v1/quotes/:id/send_quote` - Send quote
- `GET /api/v1/catalogs` - List catalogs
- `POST /api/v1/catalogs` - Upload catalog

## 📥 How to Export from Figma Make

### Option 1: Download as ZIP (Recommended)
1. In Figma Make, click the **"..."** menu (top right)
2. Select **"Download project"**
3. Extract the ZIP file on your computer
4. Open terminal in the extracted folder

### Option 2: Copy Files Manually
1. Use the file explorer in Figma Make
2. Copy each file's contents
3. Recreate the folder structure locally

## 🚀 Deployment Instructions

### Deploy to Vercel (Recommended)

#### Via GitHub (Best Practice)
1. **Create a new GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite settings
   - Click "Deploy"

#### Via Vercel CLI (Quick Deploy)
1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - For production: `vercel --prod`

### Deploy to Netlify

1. **Via Netlify CLI**
   ```bash
   npm install -g netlify-cli
   netlify login
   netlify deploy
   ```

2. **Via Netlify Web**
   - Go to [netlify.com](https://netlify.com)
   - Drag and drop the `dist` folder after building
   - Or connect your GitHub repo

### Other Platforms

#### Cloudflare Pages
```bash
npm install -g wrangler
wrangler login
wrangler pages project create quoteme
wrangler pages deploy dist
```

#### Railway
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

## 🛠️ Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start development server**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Preview production build**
   ```bash
   npm run preview
   ```

## 🔑 Environment Variables

No environment variables needed! The Railway API URL is hardcoded in `/src/app/services/api.ts`. If you need to change it, update the `API_BASE_URL` constant.

## 📱 Routes

- `/` - Landing page (guest entry)
- `/dashboard` - Main app (customers page)
- `/dashboard/quoteme` - QuoteME dashboard
- `/dashboard/quotes` - All quotes
- `/dashboard/start-new-quote` - Start new quote
- `/dashboard/quote-builder` - Quote builder
- `/dashboard/map-ingredients` - Map ingredients
- `/dashboard/export-finalize` - Export & finalize
- `/dashboard/settings` - Settings
- `/dashboard/settings/billing` - Billing settings

## 🎨 Customization

### Brand Colors
Update in `/src/styles/theme.css`:
- Primary: `#F2993D` (Orange)
- Secondary: `#A5CFDD` (Blue)
- Background: `#FFF9F3` (Cream)
- Text Dark: `#2A2A2A`
- Text Gray: `#4F4F4F`

### API Endpoint
Update in `/src/app/services/api.ts`:
```typescript
const API_BASE_URL = 'YOUR_API_URL_HERE';
```

## 📝 Notes

- Uses Tailwind CSS v4 (no config file needed)
- Mobile-first responsive design
- Guest sessions stored in localStorage
- JWT tokens stored in localStorage
- React Router 7 with data mode pattern

## 🐛 Troubleshooting

### Build Errors
- Ensure Node.js version is 18+ 
- Delete `node_modules` and `package-lock.json`, then `npm install`

### Routing Issues on Deployment
- The `vercel.json` file handles SPA routing
- For other platforms, ensure rewrites/redirects to `/index.html`

### API Connection Issues
- Check Railway API is accessible
- Verify CORS is enabled on backend
- Check browser console for error messages

## 📄 License

Private - All rights reserved

---

Built with ❤️ using Figma Make
