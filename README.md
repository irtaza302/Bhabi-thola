# Bhabi Thola 

A multiplayer card game built with Next.js and Ably for real-time communication. Fully compatible with Vercel deployment.

## How to Run

1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with:
   ```env
   ABLY_API_KEY=your_ably_api_key_here
   NEXT_PUBLIC_DATABASE_URL=your_database_url_here
   ```

3. Run database migrations (if needed):
   ```bash
   npx drizzle-kit push
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. Open your browser and go to `http://localhost:3000/game`

6. Sign up or log in, then join the game

7. Wait for at least 2 players, then the first player can start the game

## Game Rules

- The player with the Ace of Spades starts
- Follow suit if you can
- If you can't follow suit, you give a "Thola" (penalty)
- The goal is to get rid of all your cards
- The last player with cards becomes the "Bhabi" (loser)

## Development

This project uses:
- **Next.js 16** - React framework
- **Ably** - Real-time WebSocket communication (Vercel-compatible)
- **Drizzle ORM** - Database management
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **TypeScript** - Type safety

## Deployment to Vercel

This app is fully compatible with Vercel deployment:

1. **Set Environment Variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_DATABASE_URL` or `DATABASE_URL` - Your database connection string
   - `ABLY_API_KEY` or `NEXT_PUBLIC_ABLY_API_KEY` - Your Ably API key
   - `JWT_SECRET` - (Optional but recommended) Secret key for JWT tokens

2. **Run Database Migrations** (IMPORTANT):
   Before or after deployment, you need to create the database tables:
   ```bash
   # Get environment variables from Vercel
   vercel env pull .env.local
   
   # Run migrations
   npx drizzle-kit push
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Verify Database Connection**:
   After deployment, check the health endpoint:
   ```
   https://bhabi-thola.vercel.app/api/health
   ```
   This will confirm if your database is connected and tables exist.

The app uses Ably for real-time communication, which works perfectly with Vercel's serverless architecture. No separate WebSocket server needed!

**Production URL**: https://bhabi-thola.vercel.app

**⚠️ Having Vercel-specific issues?** See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed troubleshooting guide.

## Debugging

The game includes a comprehensive debug console:

1. Click the **"Debug"** button in the top-left corner of the game
2. View real-time connection logs, game events, and network status
3. Check ping times and connection quality
4. Monitor player joins/leaves and game state changes

## Troubleshooting

### Start Button Not Showing
1. **Check player count**: Need at least 2 players
2. **Verify you're the host**: Only the first player can start
3. **Check Ably connection**: Look for connection status in debug console
4. **Use debug console**: Click "Debug" to see connection status

### Authentication Errors (401/500)
1. **500 Error on Signup/Login**: 
   - Most likely cause: Database tables don't exist
   - **Solution**: Run database migrations: `npx drizzle-kit push`
   - Check health endpoint: `https://bhabi-thola.vercel.app/api/health`
   - Verify `NEXT_PUBLIC_DATABASE_URL` is set correctly in Vercel

2. **401 Error on Login**:
   - User doesn't exist or password is incorrect (this is normal for new users)
   - Try signing up first if you haven't created an account

3. **Database Connection Issues**:
   - Verify your database URL is correct
   - Check if your database allows connections from Vercel's IPs
   - For Neon/PostgreSQL: Ensure connection pooling is configured correctly

### Connection Issues
1. **Ably API key**: Make sure `ABLY_API_KEY` is set in environment variables
2. **Database connection**: Verify `NEXT_PUBLIC_DATABASE_URL` is correct
3. **Check browser console**: Look for Ably connection errors
4. **Network**: Ensure you have internet connection for Ably

### Common Solutions
- Refresh the page
- Clear browser cache
- Check environment variables are set correctly
- Use debug console to identify issues
- Verify Ably API key is valid
- See `TROUBLESHOOTING.md` for detailed help
