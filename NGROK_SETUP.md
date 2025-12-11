# How to Set Up ngrok for Mobile Scanner

## Step-by-Step Instructions

### 1. Make Sure Your App is Running

First, ensure both your React app and backend server are running:

```bash
# In the project root directory
npm run dev
```

This should start:

- Backend server on `http://localhost:5000`
- React app on `http://localhost:3000`

### 2. Install ngrok

**⚠️ For Windows Users: Download directly (RECOMMENDED)**

The npm version often fails on Windows with "cannot execute binary file" errors. Instead:

1. Go to https://ngrok.com/download
2. Download **ngrok for Windows** (choose 64-bit or 32-bit based on your system)
3. Extract the ZIP file (you'll get `ngrok.exe`)
4. **Option A - Add to PATH (easier):**
   - Create a folder like `C:\ngrok\`
   - Copy `ngrok.exe` to that folder
   - Add `C:\ngrok` to your Windows PATH environment variable
   - Restart your terminal/PowerShell
   - Now you can just type: `ngrok http 3000`
5. **Option B - Use full path (quick fix):**
   - Keep `ngrok.exe` in a folder like `C:\ngrok\` or `C:\Users\shane\Downloads\`
   - Use full path: `C:\ngrok\ngrok.exe http 3000`

**For Mac/Linux:**

```bash
npm install -g ngrok
# OR download from https://ngrok.com/download
```

### 3. Create ngrok Account (Free)

1. Go to https://dashboard.ngrok.com/signup
2. Sign up for a free account
3. Get your authtoken from the dashboard
4. Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

### 4. Start ngrok Tunnel

Open a **new terminal window** (keep your app running in the first terminal) and run:

**Windows (if you downloaded directly):**

```bash
# If added to PATH:
ngrok http 3000

# OR if using full path:
C:\ngrok\ngrok.exe http 3000
```

**Mac/Linux:**

```bash
ngrok http 3000
```

**Important:**

- Use port 3000 (React app), NOT 5000 (backend server)
- Keep this terminal window open while using ngrok

### 5. Copy the HTTPS URL

ngrok will display something like:

```
Forwarding   https://abc123-def456.ngrok-free.app -> http://localhost:3000
```

**Copy the HTTPS URL** (the one starting with `https://`)

### 6. Use the URL on Your Phone

1. On your phone, open the HTTPS URL you copied
2. Add `/mobile-scanner?session=YOUR_SESSION_ID` to the end
3. The full URL should look like:
   ```
   https://abc123-def456.ngrok-free.app/mobile-scanner?session=session_1765287265079_p3b8qz7pn
   ```

## Troubleshooting

### "Invalid Host header" error

- ✅ This happens because React dev server blocks non-localhost hosts
- ✅ **Fix:** A `.env` file has been created in the `client/` folder with `DANGEROUSLY_DISABLE_HOST_CHECK=true`
- ✅ **Restart your React app** after creating the `.env` file:
  ```bash
  # Stop the current app (Ctrl+C)
  # Then restart:
  npm run dev
  ```
- ✅ Now try accessing the ngrok URL again

### ngrok says "endpoint is offline"

- ✅ Make sure your React app is running (`npm run client` or `npm run dev`)
- ✅ Make sure ngrok is pointing to port 3000: `ngrok http 3000`
- ✅ Check that ngrok is still running (don't close the terminal)

### "Tunnel not found" error

- The ngrok URL changes every time you restart ngrok
- Copy the NEW URL from the ngrok terminal
- Update the link on your desktop Cashier page

### Camera still doesn't work

- Make sure you're using the HTTPS URL (not HTTP)
- Check browser console on your phone for errors
- Make sure camera permissions are granted

## Alternative: Use Desktop Scanner

If ngrok is too complicated, you can:

1. Use the camera scanner on your desktop computer (localhost works)
2. Type barcodes manually in the input field
3. Use a USB barcode scanner (most reliable option)
