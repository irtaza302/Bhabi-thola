# Troubleshooting Guide

## Debug Mode

The game now includes a comprehensive debug console to help identify connection and gameplay issues.

### How to Access Debug Console

1. Open the game at `http://localhost:3000/game`
2. Click the **"Debug"** button in the top-left corner
3. The debug panel will show real-time logs of all connection events

### What the Debug Console Shows

- ✅ Connection status and socket ID
- 📊 Game state updates
- 🃏 Card plays
- 🏓 Network latency (ping)
- ⚠️ Errors and warnings
- 🚀 Player join/leave events

## Common Issues

### 1. Start Button Not Showing

**Symptoms:** You're in the lobby but can't see the start button

**Possible Causes:**
- Not enough players (need at least 2)
- You're not the host (first player to join)
- Server not running

**Solutions:**
1. Check the debug console for player count
2. Make sure you're the first player who joined
3. Verify server is running: `npm run server`
4. Check server logs for connection messages

### 2. Connection Failed

**Symptoms:** "Connecting..." message that never completes

**Possible Causes:**
- Server not running on port 3001
- Firewall blocking connections
- Port already in use

**Solutions:**
1. Start the server: `npm run server`
2. Check if port 3001 is available:
   ```bash
   lsof -i :3001  # macOS/Linux
   netstat -ano | findstr :3001  # Windows
   ```
3. Check server terminal for error messages
4. Try accessing `http://localhost:3001` directly

### 3. Cards Not Scrolling

**Symptoms:** Can't see all cards in hand, scrolling doesn't work

**Solutions:**
1. Try swiping/dragging horizontally on mobile
2. Use mouse wheel or trackpad on desktop
3. Look for "← Swipe to see all cards →" indicator
4. Check if you have more than 6 cards

### 4. Game State Not Updating

**Symptoms:** Other players' actions not visible

**Solutions:**
1. Check connection status (green = connected)
2. Look at debug console for "gameState" updates
3. Refresh the page
4. Check server logs for broadcast messages

## Server Debugging

### Server Logs Explained

- 🔗 `Client connected` - New player connected
- 👤 `Player attempting to join` - Player joining game
- ✅ `Player joined` - Join successful
- 🎮 `Start game requested` - Someone clicked start
- 🚀 `Starting game` - Game beginning
- 🃏 `Cards dealt` - Cards distributed
- 🔌 `Client disconnected` - Player left
- 📈 `Server stats` - Periodic status update (every 30s)

### Checking Server Status

```bash
# Check if server is running
ps aux | grep "tsx server.ts"

# Check port usage
lsof -i :3001

# View server logs
npm run server
```

## Network Issues

### Playing on Local Network

If you want to play with others on the same WiFi:

1. Find your IP address:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. Share this URL with others:
   ```
   http://[YOUR-IP]:3000/game
   ```

3. Make sure port 3000 and 3001 are not blocked by firewall

### Firewall Configuration

**macOS:**
```bash
# Allow incoming connections
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
```

**Windows:**
- Go to Windows Defender Firewall
- Allow Node.js through firewall
- Allow ports 3000 and 3001

## Performance Issues

### High Latency

Check the ping in debug console:
- < 50ms: Excellent
- 50-100ms: Good
- 100-200ms: Acceptable
- > 200ms: Poor (check network)

### Solutions for High Latency

1. Close other network-heavy applications
2. Move closer to WiFi router
3. Use wired connection if possible
4. Restart router

## Still Having Issues?

1. **Clear browser cache** and reload
2. **Try a different browser** (Chrome, Firefox, Safari)
3. **Restart both servers**:
   ```bash
   # Stop all processes
   # Then restart
   npm run dev:full
   ```
4. **Check browser console** (F12) for JavaScript errors
5. **Check server terminal** for error messages

## Getting Help

When reporting issues, include:
1. Screenshot of debug console
2. Server terminal output
3. Browser console errors (F12)
4. Steps to reproduce the issue
5. Number of players when issue occurred