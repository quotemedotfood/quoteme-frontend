# 📥 How to Export from Figma Make

This guide shows you **exactly** how to get your code out of Figma Make and onto your computer.

## 🎯 Three Methods to Export

---

## Method 1: Download Project (Recommended) ⭐

This is the easiest method!

### Steps:
1. **Look for the menu** in the top-right corner of Figma Make
   - Usually a **"..."** (three dots) button
   - Or a **"File"** menu
   - Or an **"Export"** button

2. **Click one of these options:**
   - "Download project"
   - "Export project"  
   - "Download as ZIP"
   - "Export code"

3. **Save the ZIP file** to your computer

4. **Extract the ZIP file**
   - Right-click → "Extract All" (Windows)
   - Double-click (Mac)
   - Now you have a folder with all your code!

5. **Open terminal in that folder:**
   - Windows: Shift + Right-click → "Open PowerShell here"
   - Mac: Right-click → Services → "New Terminal at Folder"

6. **You're ready to deploy!** See [QUICKSTART.md](QUICKSTART.md)

---

## Method 2: Use Git Integration (If Available)

Some versions of Figma Make have GitHub integration:

### Steps:
1. Look for **"Connect to GitHub"** or **"Push to GitHub"** button
2. Authorize Figma Make to access GitHub
3. Create a new repository
4. Let Figma Make push the code
5. Go to Vercel/Netlify and import that repository
6. Done!

---

## Method 3: Manual Copy (Last Resort)

If the above methods don't work, you can manually copy files:

### Steps:

1. **Create a new folder** on your computer called `quoteme`

2. **Copy these files one by one** from Figma Make file explorer:
   
   **Root files:**
   ```
   - package.json
   - vite.config.ts
   - vercel.json
   - netlify.toml
   - index.html
   - README.md
   - .gitignore
   ```

   **Folders to copy:**
   ```
   - /src (entire folder)
   - /public (if it exists)
   ```

3. **Recreate the folder structure:**
   ```
   quoteme/
   ├── index.html
   ├── package.json
   ├── vite.config.ts
   ├── vercel.json
   ├── netlify.toml
   ├── .gitignore
   ├── README.md
   ├── public/
   │   └── _redirects
   └── src/
       ├── main.tsx
       ├── app/
       │   ├── App.tsx
       │   ├── routes.tsx
       │   ├── components/
       │   ├── contexts/
       │   ├── pages/
       │   └── services/
       └── styles/
           ├── index.css
           ├── tailwind.css
           └── theme.css
   ```

4. **Open terminal** in the `quoteme` folder

5. **Continue to deployment** - See [QUICKSTART.md](QUICKSTART.md)

---

## ✅ Verify Your Export

After exporting, check that you have these key files:

- ✅ `package.json` - Dependencies
- ✅ `index.html` - Entry HTML file  
- ✅ `src/main.tsx` - JavaScript entry
- ✅ `src/app/App.tsx` - Main React component
- ✅ `vite.config.ts` - Build configuration
- ✅ `vercel.json` or `netlify.toml` - Deploy config

**If any are missing, check the Figma Make file explorer and copy them!**

---

## 🚀 Next Steps

Once you have the code on your computer:

1. **Open terminal** in the project folder
2. **Run:** `npm install` (install dependencies)
3. **Test locally:** `npm run dev` (optional)
4. **Deploy:** See [QUICKSTART.md](QUICKSTART.md) for deployment

---

## 🆘 Troubleshooting

### "I don't see a download button"
- Look for: Export, Download, File menu, Share, or three-dots menu
- Try the manual copy method above
- Contact Figma Make support

### "The ZIP won't extract"
- Try a different unzip tool (7-Zip, WinRAR, etc.)
- Make sure the download completed fully
- Re-download if needed

### "I extracted it but can't find the files"
- Look in your Downloads folder
- Search your computer for `package.json`
- Check inside the extracted folder - there might be a subfolder

### "Terminal won't open"
- Windows: Hold Shift, right-click in folder, select "Open PowerShell"
- Mac: System Preferences → Keyboard → Shortcuts → Services → Enable "New Terminal at Folder"
- Or use: `cd path/to/your/folder` in any terminal

---

## 📞 Need Help?

1. Check [QUICKSTART.md](QUICKSTART.md) for deployment help
2. Check [DEPLOYMENT.md](DEPLOYMENT.md) for detailed docs
3. Make sure you have Node.js installed (https://nodejs.org)

---

**Got your code exported?** → Go to [QUICKSTART.md](QUICKSTART.md) to deploy! 🚀
