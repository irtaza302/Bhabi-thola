# Vercel Deployment Checklist

This guide helps you troubleshoot issues that only occur on Vercel (not locally).

## Required Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

### Required Variables:
1. **`NEXT_PUBLIC_DATABASE_URL`** or **`DATABASE_URL`**
   - Your PostgreSQL database connection string
   - Example: `postgresql://user:password@host:5432/database?sslmode=require`
   - ⚠️ **Important**: Use connection pooling URL if using Neon/other managed databases

2. **`ABLY_API_KEY`** or **`NEXT_PUBLIC_ABLY_API_KEY`**
   - Your Ably API key (full key including secret)
   - Example: `your-key:your-secret`

3. **`JWT_SECRET`** (Optional but recommended)
   - Secret key for JWT token signing
   - Generate a strong random string
   - If not set, uses a default (not secure for production)

### Setting Environment Variables:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for **Production**, **Preview**, and **Development** environments
3. **Redeploy** after adding variables (Vercel doesn't auto-redeploy)

## Common Vercel-Only Issues

### 1. Database Connection Errors (500 on signup/login)

**Symptoms:**
- 500 error on `/api/auth/signup`
- 500 error on `/api/auth/login`
- Health check fails: `/api/health`

**Solutions:**

#### A. Check Environment Variables
```bash
# Verify variables are set in Vercel dashboard
# They should be visible in: Settings → Environment Variables
```

#### B. Run Database Migrations
The database tables must exist before the app can work:

```bash
# Option 1: Run locally with production DB URL
export NEXT_PUBLIC_DATABASE_URL="your_production_db_url"
npx drizzle-kit push

# Option 2: Use Vercel CLI
vercel env pull .env.local
npx drizzle-kit push
```

#### C. Check Database Connection String Format
- For **Neon**: Use the connection pooling URL (ends with `?sslmode=require`)
- For **Supabase**: Use the connection pooling URL from dashboard
- Ensure SSL is enabled: `?sslmode=require`

#### D. Verify Database Access
- Check if your database allows connections from Vercel's IPs
- Some databases require IP whitelisting (Vercel uses dynamic IPs)
- For Neon/Supabase: Usually no IP restrictions needed

### 2. Authentication Errors (401)

**Symptoms:**
- 401 on `/api/auth/login`
- 401 on `/api/auth/me`

**Solutions:**
- This is normal if no users exist yet - sign up first
- If users exist, check:
  - `JWT_SECRET` is set in Vercel (if changed, existing tokens won't work)
  - Cookies are being set correctly (check browser DevTools → Application → Cookies)

### 3. Ably Connection Issues

**Symptoms:**
- Cannot connect to Ably
- Error: "Ably API key not configured"

**Solutions:**
- Verify `ABLY_API_KEY` or `NEXT_PUBLIC_ABLY_API_KEY` is set in Vercel
- Check the key format: should be `key:secret`
- Redeploy after adding the variable

### 4. Build Errors

**Symptoms:**
- Build fails on Vercel
- Module not found errors

**Solutions:**
- Check `next.config.ts` has `serverExternalPackages` configured (already done)
- Ensure all dependencies are in `package.json` (not just `package-lock.json`)
- Check Vercel build logs for specific errors

## Testing Your Deployment

### 1. Health Check
Visit: `https://bhabi-thola.vercel.app/api/health`

Expected response:
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-..."
}
```

If you see `"database": "disconnected"`, check:
- Database URL is correct
- Database tables exist (run migrations)
- Database allows connections from Vercel

### 2. Test Signup
Try creating a new account. If it fails:
- Check Vercel function logs (Dashboard → Deployments → Click deployment → Functions tab)
- Look for error messages in the logs

### 3. Check Vercel Logs
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click "Functions" tab to see serverless function logs
4. Look for error messages

## Quick Fixes

### If nothing works:
1. **Verify all environment variables are set** in Vercel dashboard
2. **Run database migrations** (most common issue)
3. **Redeploy** after making changes
4. **Check Vercel function logs** for specific errors
5. **Test health endpoint** to verify database connection

### Database Migration Command:
```bash
# Get production DB URL from Vercel
vercel env pull .env.local

# Run migrations
npx drizzle-kit push
```

## Environment Variable Checklist

Before deploying, ensure these are set in Vercel:

- [ ] `NEXT_PUBLIC_DATABASE_URL` or `DATABASE_URL`
- [ ] `ABLY_API_KEY` or `NEXT_PUBLIC_ABLY_API_KEY`
- [ ] `JWT_SECRET` (recommended)

## Still Having Issues?

1. Check Vercel function logs for specific error messages
2. Test the health endpoint: `/api/health`
3. Verify database tables exist (run migrations)
4. Ensure environment variables are set for the correct environment (Production/Preview/Development)

