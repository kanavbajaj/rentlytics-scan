# 🚀 Deployment Guide for Smart Rental Tracking System

## Option 1: Deploy to Vercel (Recommended)

### Prerequisites
- Node.js 18+ installed
- Vercel CLI installed (`npm install -g vercel`)
- Supabase project set up

### Steps
1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to existing project or create new
   - Set project name
   - Confirm deployment

4. **Set environment variables in Vercel dashboard:**
   - Go to your project settings
   - Add environment variables:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     VITE_HUGGING_FACE_API_KEY=your_hf_key (optional)
     ```

## Option 2: Deploy to Netlify

### Steps
1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Drag and drop the `dist` folder to Netlify**

3. **Set environment variables in Netlify dashboard**

## Option 3: Deploy to GitHub Pages

### Steps
1. **Add to package.json:**
   ```json
   "homepage": "https://yourusername.github.io/yourrepo",
   "scripts": {
     "predeploy": "npm run build",
     "deploy": "gh-pages -d dist"
   }
   ```

2. **Install gh-pages:**
   ```bash
   npm install --save-dev gh-pages
   ```

3. **Deploy:**
   ```bash
   npm run deploy
   ```

## Environment Variables Setup

Create a `.env.local` file in your project root:

```env
VITE_SUPABASE_URL=https://zwwpegesoehlicfvzjsm.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_HUGGING_FACE_API_KEY=your_huggingface_key_here
```

## Supabase Configuration

Your Supabase project ID: `zwwpegesoehlicfvzjsm`

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings > API
4. Copy the URL and anon key

## Post-Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase connection working
- [ ] QR code scanning functional
- [ ] Database migrations applied
- [ ] Mobile responsiveness tested
- [ ] Performance optimized

## Troubleshooting

### Common Issues:
1. **Build fails:** Check Node.js version and dependencies
2. **Environment variables not working:** Ensure they start with `VITE_`
3. **Supabase connection issues:** Verify URL and keys
4. **Routing issues:** Check Vercel configuration

### Support:
- Check Vercel logs in dashboard
- Verify Supabase connection
- Test locally with `npm run build && npm run preview`
