# ChaosTraderX Installation & Setup Guide

## 🚀 Complete Installation Instructions

### Prerequisites
- Google Chrome browser (version 88 or higher)
- Exness demo or live trading account
- Stable internet connection
- (Optional) API keys for enhanced sentiment analysis

### Step 1: Download and Prepare Extension

1. **Download the extension files** to your computer
2. **Extract all files** to a dedicated folder (e.g., `ChaosTraderX-v1.1`)
3. **Verify all files** are present:
   ```
   ✓ manifest.json
   ✓ background.js
   ✓ content.js
   ✓ popup.html/js/css
   ✓ injected.js
   ✓ All analysis engines (.js files)
   ✓ api_rules.json
   ```

### Step 2: Install Extension in Chrome

1. **Open Chrome** and navigate to `chrome://extensions/`
2. **Enable Developer Mode** (toggle in top-right corner)
3. **Click "Load unpacked"**
4. **Select the ChaosTraderX folder** containing `manifest.json`
5. **Verify installation**: Extension icon should appear in Chrome toolbar

### Step 3: Configure API Keys (Optional but Recommended)

For enhanced sentiment analysis, configure these free API keys:

#### NewsAPI (Free Tier - 500 requests/day)
1. Visit [newsapi.org](https://newsapi.org/)
2. Sign up for free account
3. Copy your API key
4. Open extension popup → Settings → API Configuration
5. Paste NewsAPI key

#### Alpha Vantage (Free Tier - 5 calls/minute)
1. Visit [alphavantage.co](https://www.alphavantage.co/)
2. Get free API key
3. Add to extension settings

### Step 4: Test on Exness Platform

1. **Open Exness Platform**:
   - Navigate to `https://my.exness.global/webtrading/`
   - Log in to your demo account

2. **Verify Extension Detection**:
   - Click ChaosTraderX icon in Chrome toolbar
   - Check popup shows platform detection
   - Look for "Platform: ExnessGlobalWeb" status

3. **Test Data Extraction**:
   - Select a trading symbol (EURUSD recommended)
   - Wait 10-15 seconds for data to populate
   - Verify price updates in extension popup

### Step 5: Configure Trading Parameters

**Recommended Initial Settings**:
- **Symbol**: EURUSD (most stable for testing)
- **Timeframe**: M15 (balanced analysis)
- **Confidence Threshold**: 98% (very conservative)
- **Max Lot Size**: 0.01 (minimum risk)
- **Sentiment Filter**: ✅ Enabled
- **Volume Validation**: ✅ Enabled
- **Auto Trading**: ❌ Disabled (for initial testing)

### Step 6: Start Analysis Mode

1. Click **"Start Analysis"** (not "Start Trading" initially)
2. Monitor real-time analysis for 15-30 minutes
3. Verify all components are working:
   - Al Brooks Analysis updating
   - Volume Analysis functioning
   - Sentiment showing data
   - Account information displayed

## ⚙️ Configuration Options

### Trading Parameters
| Setting | Range | Recommended | Description |
|---------|-------|-------------|-------------|
| Confidence Threshold | 50-99% | 95-98% | Minimum confidence for signals |
| Max Lot Size | 0.01-10.0 | 0.01-0.10 | Maximum position size |
| Daily Trade Limit | 1-50 | 5-10 | Max trades per day |
| Cooldown Period | 1-60 min | 5-10 min | Time between trades |

### Risk Management
| Setting | Default | Description |
|---------|---------|-------------|
| Max Positions | 3 | Concurrent open positions |
| Max Drawdown | 5% | Account protection limit |
| Stop Loss | Auto | Calculated per trade |
| Take Profit | Auto | Risk/reward optimized |

## 🔧 Troubleshooting Guide

### Common Issues & Solutions

#### Extension Not Loading
**Symptoms**: Extension icon missing or grayed out
**Solutions**:
1. Verify Chrome version (88+)
2. Check Developer Mode is enabled
3. Reload extension: `chrome://extensions/` → Reload button
4. Check browser console for errors (F12)

#### No Data from Exness Platform
**Symptoms**: Popup shows "No data" or blank fields
**Solutions**:
1. **Refresh Exness page** completely
2. **Wait 30+ seconds** for full page load
3. **Check correct URL**: Must be `my.exness.global/webtrading/`
4. **Verify account login** status
5. **Clear browser cache** and reload

#### Analysis Engines Not Working
**Symptoms**: Analysis fields show "N/A" or errors
**Solutions**:
1. Check browser console (F12) for errors
2. Verify sufficient price history (wait 5-10 minutes)
3. Try different symbol (EURUSD → GBPUSD)
4. Check market hours (forex 24/5)

#### Trading Buttons Not Responding
**Symptoms**: Can't execute trades or buttons disabled
**Solutions**:
1. **Verify demo account** has sufficient balance
2. **Check trading hours** for selected symbol
3. **Ensure manual trading** works first
4. **Browser security**: Some browsers block automated clicks
5. **Two-factor authentication**: May prevent automation

#### Poor Signal Quality
**Symptoms**: Low confidence scores or no signals
**Solutions**:
1. **Lower confidence threshold** to 90-95%
2. **Try different timeframes** (M15 → H1)
3. **Check market volatility** (avoid major news events)
4. **Wait for better market conditions**

#### Memory/Performance Issues
**Symptoms**: Browser slow or extension crashes
**Solutions**:
1. **Close other browser tabs**
2. **Restart Chrome** periodically
3. **Clear extension logs** (Settings → Clear Logs)
4. **Update Chrome** to latest version

### Error Messages

#### "Platform Not Detected"
- Ensure you're on `my.exness.global/webtrading/`
- Wait for complete page load
- Check for page updates/changes

#### "API Rate Limit Exceeded"
- Wait 1 hour for API limits to reset
- Consider upgrading to paid API tiers
- Check API key configuration

#### "Trading Validation Failed"
- Verify account permissions
- Check account balance
- Ensure trading is enabled

#### "Emergency Stop Activated"
- System detected potential issue
- Check all settings before restarting
- Review recent logs for cause

## 🎯 Testing Protocol

### Phase 1: Installation Testing (5 minutes)
1. ✅ Extension loads without errors
2. ✅ Popup opens and displays correctly
3. ✅ Platform detection works
4. ✅ Settings can be modified and saved

### Phase 2: Data Extraction Testing (15 minutes)
1. ✅ Price data updates regularly
2. ✅ Symbol detection works
3. ✅ Account information displays
4. ✅ No console errors

### Phase 3: Analysis Testing (30 minutes)
1. ✅ Al Brooks analysis generates data
2. ✅ Volume analysis functions
3. ✅ Sentiment analysis provides scores
4. ✅ Confidence levels vary appropriately

### Phase 4: Signal Generation Testing (60 minutes)
1. ✅ Trading signals generated
2. ✅ Risk management applies
3. ✅ Signal quality reasonable
4. ✅ Emergency stop functions

### Phase 5: Live Testing (Demo Account Only)
1. ✅ Enable auto trading on demo
2. ✅ Monitor for 2-4 hours
3. ✅ Verify trade execution
4. ✅ Check risk management

## 📊 Performance Expectations

### During Active Market Hours
- **Price Updates**: Every 1-3 seconds
- **Analysis Updates**: Every 30-60 seconds
- **Signal Generation**: 0-5 signals per hour
- **Confidence Scores**: 60-95% range

### Signal Quality Metrics
- **High Confidence (95%+)**: 1-2 per day (rare but quality)
- **Medium Confidence (90-94%)**: 3-8 per day
- **Low Confidence (85-89%)**: Filtered out by default

### Resource Usage
- **Memory**: 50-100 MB
- **CPU**: Low (1-5%)
- **Network**: Minimal (APIs + page data)

## 🚨 Safety Reminders

⚠️ **ALWAYS START WITH DEMO ACCOUNTS**
⚠️ **Never risk more than you can afford to lose**
⚠️ **Monitor the system actively during first week**
⚠️ **Understand all settings before enabling auto trading**
⚠️ **Keep emergency stop easily accessible**

## 📞 Support & Updates

- **Browser Console**: Always check F12 for error details
- **Extension Logs**: Available in popup → Settings → View Logs
- **Health Check**: Use popup → Tools → System Health
- **Updates**: Extension may need updates when Exness changes interface

## 🔄 Update Procedure

When Exness platform changes:
1. **Disable auto trading** immediately
2. **Test data extraction** manually
3. **Update selectors** if needed
4. **Re-test all functions**
5. **Gradually re-enable features**

This guide ensures safe, reliable operation of ChaosTraderX with minimal risk and maximum functionality.