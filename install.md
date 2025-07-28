# ChaosTraderX Enhanced Installation Guide

## Installation Steps

### 1. Load the Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" button
4. Select the `chaos-latest` folder containing the extension files
5. The extension should now appear in your extensions list

### 2. Verify Installation
1. Navigate to an Exness trading platform page
2. Open Chrome DevTools (F12)
3. Check the Console tab for initialization messages:
   - "ChaosTraderX Content Script initialized"
   - "ExnessScraper initialized for platform: [detected platform]"
   - "ExnessScraper module loaded successfully"

### 3. Test the Enhanced Scraper
1. Open the extension popup by clicking the ChaosTraderX icon
2. Enable debug mode if needed
3. Check that market data and account data are being scraped correctly
4. Look for "enhanced" source indicators in the console logs

### 4. Troubleshooting

#### If the extension doesn't load:
- Check that all files are present in the folder
- Verify the manifest.json file is valid
- Look for error messages in the Extensions page

#### If scraping fails:
1. Open DevTools Console
2. Look for error messages
3. Try running diagnostics:
   ```javascript
   // In the console on the trading page
   window.postMessage({
     type: 'CONTENT_SCRIPT_MESSAGE',
     action: 'RUN_DIAGNOSTICS'
   }, '*');
   ```

#### If trading actions fail:
- Ensure you're on a supported Exness platform
- Check that trading buttons are visible and enabled
- Verify lot size input is accessible

### 5. Configuration
The extension will automatically:
- Detect the trading platform type
- Adapt selectors based on the platform
- Cache successful selectors for better performance
- Retry failed operations automatically

### 6. Monitoring
Watch the console for:
- Successful data extraction messages
- Retry attempts and their outcomes
- Selector caching and optimization
- Trading execution results

## Supported Platforms
- Exness Global WebTrading
- MT4 Web Terminal
- MT5 Web Terminal
- Generic Exness platforms

## Performance Tips
1. Keep the browser tab active for best performance
2. Avoid switching between multiple trading platforms rapidly
3. Clear browser cache if experiencing persistent issues
4. Use debug mode only when troubleshooting (impacts performance)

## Support
If you encounter issues:
1. Enable debug mode
2. Run diagnostics
3. Check the browser console for detailed error messages
4. Review the SCRAPER_IMPROVEMENTS.md file for technical details