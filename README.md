# Bhabi Thola

A multiplayer card game built with Next.js and Socket.io.

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start both the Next.js app and Socket.io server:
   ```bash
   npm run dev:full
   ```
   
   Or run them separately:
   ```bash
   # Terminal 1 - Start the Socket.io server
   npm run server
   
   # Terminal 2 - Start the Next.js app
   npm run dev
   ```

3. Open your browser and go to `http://localhost:3000/game`

4. Enter your name and join the game

5. Wait for at least 2 players, then the first player can start the game

## Game Rules

- The player with the Ace of Spades starts
- Follow suit if you can
- If you can't follow suit, you give a "Thola" (penalty)
- The goal is to get rid of all your cards
- The last player with cards becomes the "Bhabi" (loser)

## Development

This project uses:
- **Next.js 16** - React framework
- **Socket.io** - Real-time communication
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **TypeScript** - Type safety

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
3. **Check servers**: Both Next.js and Socket.io must be running
4. **Use debug console**: Click "Debug" to see connection status

### Connection Issues
1. **Server not running**: Run `npm run server` in one terminal
2. **Port conflicts**: Check if port 3001 is available
3. **Firewall**: Allow Node.js through firewall
4. **Network**: Try `http://localhost:3000/game` directly

### Common Solutions
- Refresh the page
- Clear browser cache
- Check server terminal for errors
- Use debug console to identify issues
- See `TROUBLESHOOTING.md` for detailed help