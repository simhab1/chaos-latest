# ChaosTraderX - Exness Trading Automation Extension

## Overview
ChaosTraderX is a Chrome extension that provides AI-powered trading automation for the Exness platform using Al Brooks price action methodology, volume analysis, and sentiment filtering.

## Features
- **Al Brooks Analysis**: Market structure analysis, pattern recognition, signal bar identification
- **Volume Analysis**: Volume spike detection, order block identification, institutional activity detection
- **Sentiment Filtering**: Multi-source sentiment analysis to avoid extreme market conditions
- **Risk Management**: Position sizing, stop-loss/take-profit calculation, daily limits
- **Real-time Monitoring**: Live account data, trade history, performance statistics
- **Professional UI**: Comprehensive control panel with real-time analysis display

## Installation Instructions

### 1. Download and Extract
- Download the ChaosTraderX-Extension.zip file
- Extract all files to a folder (e.g., "ChaosTraderX")

### 2. Load Extension in Chrome
1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the ChaosTraderX folder containing manifest.json
6. Extension will appear in your toolbar

### 3. Setup and Usage
1. Navigate to any Exness platform (demo account recommended for testing)
2. Click the ChaosTraderX extension icon in toolbar
3. Configure your trading parameters:
   - Symbol (BTCUSD, XAUUSD, etc.)
   - Timeframe (M1, M5, M15, etc.)
   - Confidence threshold (85-99%)
   - Maximum lot size
   - Enable/disable sentiment filter and volume validation

### 4. Start Trading
1. Click "Start Trading" to begin automated analysis
2. Monitor real-time analysis in the popup
3. View account information and trade history
4. Use "Emergency Stop" if needed

## Safety Features
- **Demo Account Testing**: Always test on demo accounts first
- **Daily Trade Limits**: Configurable maximum trades per day
- **Cooldown Periods**: Minimum time between trades
- **Position Limits**: Maximum number of open positions
- **Emergency Stop**: Immediate trading halt functionality
- **Risk Management**: Built-in position sizing and stop-loss calculation

## Platform Compatibility
- MT4 (MetaTrader 4)
- MT5 (MetaTrader 5) 
- Exness WebTerminal
- TradingView integration

## Technical Architecture
- **Background Service Worker**: Core analysis engines and trading logic
- **Content Scripts**: DOM manipulation and data extraction
- **Injected Scripts**: Direct page interaction for real-time data
- **Popup Interface**: User control panel and monitoring

## Analysis Components

### Al Brooks Methodology
- Market structure analysis (Bull/Bear trends)
- Pattern recognition (Flags, Wedges, Triangles, Channels)
- Signal bar identification and quality assessment
- Always-in direction determination
- Support and resistance level detection

### Volume Analysis
- Volume spike detection with configurable thresholds
- Order block identification for institutional activity
- Breakout volume confirmation
- Volume profile analysis
- Confidence scoring based on volume patterns

### Sentiment Analysis
- News sentiment analysis simulation
- Social media sentiment tracking
- Technical indicator sentiment
- Economic calendar integration
- Extreme sentiment filtering (contrarian approach)

## Risk Warnings
⚠️ **Important Safety Information**:
- This is automated trading software with inherent risks
- Always test thoroughly on demo accounts before live trading
- Understand all settings and parameters before activation
- Monitor the extension's performance regularly
- Be aware of market conditions and news events
- Never risk more than you can afford to lose
- The software may have bugs or unexpected behavior
- Past performance does not guarantee future results

## Configuration Options

### Trading Parameters
- **Confidence Threshold**: Minimum confidence level for trade execution (85-99%)
- **Max Lot Size**: Maximum position size per trade
- **Auto Trading**: Enable/disable automated trade execution
- **Sentiment Filter**: Filter trades during extreme market sentiment
- **Volume Validation**: Require volume confirmation for signals

### Risk Management
- **Daily Trade Limit**: Maximum number of trades per day (default: 10)
- **Max Positions**: Maximum concurrent open positions (default: 3)
- **Cooldown Period**: Minimum time between trades (default: 5 minutes)
- **Max Drawdown**: Maximum acceptable account drawdown (default: 5%)

## Troubleshooting

### Common Issues
1. **Extension not loading**: Check Chrome developer mode is enabled
2. **No data detected**: Ensure you're on a supported Exness platform
3. **Analysis showing blanks**: Wait for page to fully load, refresh if needed
4. **Trading buttons not working**: Check if platform interface has changed

### Debug Information
- Open Chrome DevTools (F12) to view console logs
- Check the extension popup for error messages
- Verify account data is being scraped correctly
- Test with different symbols and timeframes

## Support and Updates
- Extension may require updates when Exness changes their interface
- DOM selectors may need adjustment for new platform versions
- Report issues with specific platform URLs and error messages

## File Structure
```
ChaosTraderX/
├── manifest.json              # Extension configuration
├── background.js              # Background service worker
├── content.js                 # Content script for DOM interaction
├── content.css               # Page styling
├── injected.js               # Injected page script
├── injected-advanced.js      # Advanced injection script
├── popup.html                # Extension popup interface
├── popup.js                  # Popup functionality
├── popup.css                 # Popup styling
├── albrooks-analysis.js      # Al Brooks analysis engine
├── volume-analysis.js        # Volume analysis engine
├── sentiment-analysis.js     # Sentiment analysis engine
├── trading-engine.js         # Trading execution engine
├── exness-scraper.js         # Data scraping utilities
└── README.md                 # This file
```

## License and Disclaimer
This software is provided for educational and research purposes. Users are responsible for compliance with all applicable laws and regulations. The developers are not responsible for any financial losses or damages resulting from the use of this software.

## Version
Current Version: 1.0.0
Last Updated: July 2025