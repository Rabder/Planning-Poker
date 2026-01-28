# Deployment Plan: Planning Poker MVP

## Overview
Deploy the planning poker app to free hosting platforms (Vercel for frontend, Render for backend) to make it publicly accessible over the internet.

## Current State Analysis

**Hardcoded URLs that need to be dynamic:**
- `client/src/App.tsx:8` - Socket connection URL: `http://localhost:3001`
- `server/src/server.ts:22` - CORS origin: `http://localhost:3000`
- `client/vite.config.ts:10` - Proxy target (only used in dev, not needed in production)

**Good existing configuration:**
- Server already uses `process.env.PORT` (server.ts:13)
- `.gitignore` already excludes `.env` files
- Both client and server have build scripts configured

## Implementation Steps

### Phase 1: Add Environment Variable Support

**1.1 Client Environment Variables**
- Create `client/.env.development` with local backend URL
- Create `client/.env.production` (empty/template, will be set in Vercel)
- Create `client/.env.example` for documentation
- Update `client/src/App.tsx:8` to use `import.meta.env.VITE_API_URL` instead of hardcoded URL
- Vite automatically exposes env vars prefixed with `VITE_` to the client code

**1.2 Server Environment Variables**
- Create `server/.env.development` with local frontend URL
- Create `server/.env.production` (empty/template, will be set in Render)
- Create `server/.env.example` for documentation
- Update `server/src/server.ts:22` to use `process.env.CLIENT_URL` for CORS origin
- Support multiple origins if needed (comma-separated list)

### Phase 2: Update Code for Production

**2.1 Server CORS Configuration** (`server/src/server.ts`)
- Replace hardcoded `origin: 'http://localhost:3000'` with:
  ```typescript
  origin: process.env.CLIENT_URL || 'http://localhost:3000'
  ```
- Consider allowing multiple origins by splitting on comma if needed
- Ensure `credentials: true` is set if needed for cookie-based sessions (not currently needed)

**2.2 Client Socket Connection** (`client/src/App.tsx`)
- Replace hardcoded `'http://localhost:3001'` with:
  ```typescript
  const socket = useSocket(import.meta.env.VITE_API_URL || 'http://localhost:3001')
  ```

**2.3 Vite Configuration** (`client/vite.config.ts`)
- Proxy is only needed for local development (already correctly configured)
- No changes needed - proxy won't be used in production build

### Phase 3: Backend Deployment to Render

**3.1 Prepare Backend for Render**
- Verify `server/package.json` has correct start script: `"start": "node dist/server.js"`
- Verify build script: `"build": "tsc"`
- Server will run on Render's assigned PORT (already handled via process.env.PORT)

**3.2 Deploy to Render**
1. Create Render account at https://render.com
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure service:
   - **Name**: `planning-poker-backend` (or user's choice)
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Add environment variable in Render dashboard:
   - `CLIENT_URL` = (will be set after frontend deployment)
6. Deploy and note the backend URL (e.g., `https://planning-poker-backend.onrender.com`)

**Note on Render Free Tier:**
- Services spin down after 15 minutes of inactivity
- First request after sleep takes ~30-60 seconds to wake up
- Suitable for demos and personal use

### Phase 4: Frontend Deployment to Vercel

**4.1 Prepare Frontend for Vercel**
- Verify `client/package.json` has correct build script: `"build": "tsc && vite build"`
- Build output directory is `dist` (Vite default, Vercel auto-detects)

**4.2 Deploy to Vercel**
1. Create Vercel account at https://vercel.com
2. Click "Add New..." → "Project"
3. Import GitHub repository
4. Configure project:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: `client`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
5. Add environment variable in Vercel dashboard:
   - `VITE_API_URL` = (the Render backend URL from Phase 3, e.g., `https://planning-poker-backend.onrender.com`)
6. Deploy and note the frontend URL (e.g., `https://planning-poker-xyz.vercel.app`)

### Phase 5: Update Backend CORS with Frontend URL

**5.1 Configure Backend Environment**
1. Go back to Render dashboard
2. Navigate to planning poker backend service
3. Update environment variable:
   - `CLIENT_URL` = (the Vercel frontend URL from Phase 4)
4. Trigger redeploy or service will auto-redeploy on env change

### Phase 6: Testing & Verification

**6.1 Test the Deployed Application**
1. Open the Vercel frontend URL in browser
2. Verify "Socket status: Connected ✓" appears
3. Open the same URL in an incognito window (simulate second user)
4. Create a room with ID "test123" and join from both windows
5. Verify both players appear in player list
6. Submit votes from both players
7. Verify vote status shows "✓ Voted" for voted players
8. Click "Reveal Votes" and verify votes are visible to both players
9. Test disconnect: close one window, verify other window shows updated player list

**6.2 Troubleshooting Common Issues**
- **Socket not connecting**: Check browser console for CORS errors
  - Verify `CLIENT_URL` in Render matches Vercel URL exactly (no trailing slash)
  - Verify `VITE_API_URL` in Vercel matches Render URL exactly
- **Render cold start**: First connection may take 30-60 seconds on free tier
- **Environment variables not working**: Trigger redeployment after adding env vars

## Critical Files to Modify

1. `client/src/App.tsx` - Update socket connection URL
2. `server/src/server.ts` - Update CORS origin
3. `client/.env.development` - Create with local backend URL
4. `client/.env.example` - Create for documentation
5. `server/.env.development` - Create with local frontend URL
6. `server/.env.example` - Create for documentation

## Post-Deployment Considerations

**Security Enhancements** (future):
- Add rate limiting to prevent abuse
- Add room password protection
- Implement session timeouts
- Add input validation and sanitization

**Production Improvements** (future):
- Add database for persistence (MongoDB Atlas free tier)
- Implement proper logging (Winston + log service)
- Add error tracking (Sentry free tier)
- Add analytics (Google Analytics or Plausible)
- Set up custom domains if desired

**Free Tier Limitations to Communicate:**
- **Render**: 750 hours/month free (enough for one service), spins down after 15 min idle
- **Vercel**: 100 GB bandwidth/month, unlimited projects on hobby plan
- Both require GitHub authentication and public repositories (or paid plan for private repos)

## Success Criteria

✅ Frontend accessible via public Vercel URL
✅ Backend accessible via public Render URL
✅ Socket.io connection works across public URLs
✅ Multiple users can join same room from different locations
✅ Real-time voting and reveal functionality works
✅ Local development environment still works with .env files
