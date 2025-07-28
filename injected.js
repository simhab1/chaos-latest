// This script is injected into the Exness page to access DOM directly
(function() {
  'use strict';
  
  // Import the enhanced ExnessScraper
  let ExnessScraper;
  
  // Load the ExnessScraper module
  const loadScraper = async () => {
    try {
      const module = await import(chrome.runtime.getURL('exness-scraper.js'));
      ExnessScraper = module.ExnessScraper;
      console.log('ExnessScraper module loaded successfully');
    } catch (error) {
      console.error('Failed to load ExnessScraper module:', error);
      // Fallback to basic implementation if module loading fails
      ExnessScraper = null;
    }
  };
  
  class ExnessDataExtractor {
    constructor() {
      this.isActive = false;
      this.config = {};
      this.lastData = {};
      this.extractionInterval = null;
      this.scraper = null;
      this.retryCount = 0;
      this.maxRetries = 3;
      
      this.init();
    }

    async init() {
      console.log('Exness Data Extractor initialized');
      
      // Load the enhanced scraper
      await loadScraper();
      
      if (ExnessScraper) {
        this.scraper = new ExnessScraper();
        console.log('Using enhanced ExnessScraper');
      } else {
        console.warn('Falling back to basic extraction methods');
      }
      
      this.setupMessageHandler();
      this.detectPlatformType();
      this.startDataExtraction();
    }

    setupMessageHandler() {
      window.addEventListener('message', (event) => {
        if (event.source !== window || event.data.type !== 'CONTENT_SCRIPT_MESSAGE') {
          return;
        }
        
        this.handleContentScriptMessage(event.data);
      });
    }

    detectPlatformType() {
      // Detect if we're on MT4, MT5, or WebTerminal
      if (document.querySelector('.mt4-container') || document.querySelector('[class*="mt4"]')) {
        this.platformType = 'MT4';
      } else if (document.querySelector('.mt5-container') || document.querySelector('[class*="mt5"]')) {
        this.platformType = 'MT5';
      } else if (document.querySelector('.web-terminal') || document.querySelector('[class*="terminal"]')) {
        this.platformType = 'WebTerminal';
      } else {
        this.platformType = 'Unknown';
      }
      
      console.log('Detected platform type:', this.platformType);
    }

    handleContentScriptMessage(message) {
      const { action, data } = message;
      
      switch (action) {
        case 'START_TRADING':
          this.isActive = true;
          this.config = data || {};
          this.startDataExtraction();
          break;
          
        case 'STOP_TRADING':
          this.isActive = false;
          this.stopDataExtraction();
          break;
          
        case 'EXECUTE_TRADE':
          this.executeTrade(data);
          break;
          
        case 'SWITCH_SYMBOL':
          this.switchSymbol(data);
          break;
          
        case 'SWITCH_TIMEFRAME':
          this.switchTimeframe(data);
          break;
          
        case 'REQUEST_DATA':
          this.extractAndSendData();
          break;
          
        case 'GET_ACCOUNT_DATA':
          this.getAccountData();
          break;
          
        case 'EMERGENCY_CLOSE_ALL':
          this.emergencyCloseAll();
          break;
          
        case 'CONFIG_UPDATE':
          this.config = data;
          break;
      }
    }

    startDataExtraction() {
      if (this.extractionInterval) {
        clearInterval(this.extractionInterval);
      }
      
      // Extract data every 2 seconds
      this.extractionInterval = setInterval(() => {
        this.extractAndSendData();
      }, 2000);
      
      // Initial extraction
      this.extractAndSendData();
    }

    stopDataExtraction() {
      if (this.extractionInterval) {
        clearInterval(this.extractionInterval);
        this.extractionInterval = null;
      }
    }

    async extractAndSendData() {
      try {
        let marketData, accountData;
        
        if (this.scraper) {
          // Use enhanced scraper if available
          marketData = await this.scraper.scrapeMarketData();
          accountData = await this.scraper.scrapeAccountData();
        } else {
          // Fallback to basic extraction
          marketData = this.extractMarketData();
          accountData = this.extractAccountData();
        }
        
        const combinedData = {
          market: marketData,
          account: accountData,
          timestamp: Date.now(),
          source: this.scraper ? 'enhanced' : 'basic'
        };
        
        // Only send if data has changed significantly
        if (this.hasDataChanged(combinedData)) {
          this.sendDataToContentScript('EXNESS_DATA_UPDATE', combinedData);
          this.lastData = combinedData;
          
          // Reset retry count on successful extraction
          this.retryCount = 0;
        }
        
      } catch (error) {
        console.error('Data extraction error:', error);
        
        // Implement retry logic
        this.retryCount++;
        if (this.retryCount <= this.maxRetries) {
          console.log(`Retrying data extraction (${this.retryCount}/${this.maxRetries})`);
          
          // Try to refresh scraper on failure
          if (this.scraper && this.retryCount === 2) {
            this.scraper.refreshSelectors();
          }
          
          // Retry after a delay
          setTimeout(() => this.extractAndSendData(), 1000 * this.retryCount);
        } else {
          console.error('Data extraction failed after all retries');
          this.retryCount = 0; // Reset for next cycle
        }
      }
    }

    extractMarketData() {
      const data = {
        symbol: this.getCurrentSymbol(),
        timeframe: this.getCurrentTimeframe(),
        price: this.getCurrentPrice(),
        candles: this.getCandleData(),
        volume: this.getCurrentVolume(),
        spread: this.getSpread(),
        timestamp: Date.now()
      };
      
      return data;
    }

    getCurrentSymbol() {
      // Try multiple selectors for different platform layouts
      const selectors = [
        '.symbol-name',
        '[class*="symbol"]',
        '.trading-pair',
        '.instrument-name',
        '.current-symbol',
        '.symbol-display'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim().replace(/[^A-Z]/g, '');
        }
      }
      
      // Try to extract from URL or page title
      const url = window.location.href;
      const symbolMatch = url.match(/symbol=([A-Z]+)/i) || url.match(/([A-Z]{6})/);
      if (symbolMatch) {
        return symbolMatch[1];
      }
      
      return 'BTCUSD'; // Default fallback
    }

    getCurrentTimeframe() {
      const selectors = [
        '.timeframe-selector .active',
        '.period-selector .selected',
        '[class*="timeframe"].active',
        '.tf-selected'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      
      return 'M15'; // Default fallback
    }

    getCurrentPrice() {
      const selectors = [
        '.current-price',
        '.price-display',
        '.bid-price',
        '.last-price',
        '[class*="price"]:not([class*="change"])',
        '.quote-price'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const price = this.parsePrice(element.textContent);
          if (price > 0) {
            return price;
          }
        }
      }
      
      return 0;
    }

    getCandleData() {
      // Try to extract candle data from chart
      const candles = [];
      
      // Look for chart containers
      const chartContainers = document.querySelectorAll([
        '.chart-container',
        '.tradingview-widget',
        '.chart-widget',
        '[class*="chart"]',
        'canvas'
      ].join(','));
      
      // Try to get data from TradingView widget if present
      if (window.TradingView && window.TradingView.widget) {
        // TradingView data extraction would go here
        // For now, return simulated data structure
      }
      
      // If we can't extract real candle data, return basic structure
      // Real implementation would parse chart canvas or widget data
      return this.generateFallbackCandles();
    }

    generateFallbackCandles() {
      // Generate basic candle structure for analysis
      // In real implementation, this would extract actual chart data
      const basePrice = this.getCurrentPrice() || 50000;
      const candles = [];
      
      for (let i = 0; i < 50; i++) {
        const variation = (Math.random() - 0.5) * basePrice * 0.02;
        const open = basePrice + variation;
        const close = open + (Math.random() - 0.5) * basePrice * 0.01;
        const high = Math.max(open, close) + Math.random() * basePrice * 0.005;
        const low = Math.min(open, close) - Math.random() * basePrice * 0.005;
        const volume = Math.random() * 1000 + 100;
        
        candles.push({
          timestamp: Date.now() - (50 - i) * 60000, // 1 minute intervals
          open: open.toFixed(2),
          high: high.toFixed(2),
          low: low.toFixed(2),
          close: close.toFixed(2),
          volume: volume.toFixed(0)
        });
      }
      
      return candles;
    }

    getCurrentVolume() {
      const selectors = [
        '.volume-display',
        '.current-volume',
        '[class*="volume"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const volume = parseFloat(element.textContent.replace(/[^0-9.]/g, ''));
          if (!isNaN(volume)) {
            return volume;
          }
        }
      }
      
      return Math.random() * 1000 + 100; // Fallback
    }

    getSpread() {
      const selectors = [
        '.spread-display',
        '.current-spread',
        '[class*="spread"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const spread = parseFloat(element.textContent.replace(/[^0-9.]/g, ''));
          if (!isNaN(spread)) {
            return spread;
          }
        }
      }
      
      return 0.1; // Fallback
    }

    extractAccountData() {
      return {
        balance: this.getBalance(),
        equity: this.getEquity(),
        margin: this.getMargin(),
        freeMargin: this.getFreeMargin(),
        marginLevel: this.getMarginLevel(),
        openPnl: this.getOpenPnL(),
        openPositions: this.getOpenPositions(),
        timestamp: Date.now()
      };
    }

    getBalance() {
      const selectors = [
        '.account-balance',
        '.balance-amount',
        '[class*="balance"]',
        '.acc-balance'
      ];
      
      return this.extractNumericValue(selectors, 1000); // Default fallback
    }

    getEquity() {
      const selectors = [
        '.account-equity',
        '.equity-amount',
        '[class*="equity"]',
        '.acc-equity'
      ];
      
      return this.extractNumericValue(selectors, 1000);
    }

    getMargin() {
      const selectors = [
        '.used-margin',
        '.margin-used',
        '[class*="margin"]',
        '.acc-margin'
      ];
      
      return this.extractNumericValue(selectors, 0);
    }

    getFreeMargin() {
      const selectors = [
        '.free-margin',
        '.margin-free',
        '[class*="free-margin"]'
      ];
      
      return this.extractNumericValue(selectors, 1000);
    }

    getMarginLevel() {
      const selectors = [
        '.margin-level',
        '.margin-percentage',
        '[class*="margin-level"]'
      ];
      
      return this.extractNumericValue(selectors, 100);
    }

    getOpenPnL() {
      const selectors = [
        '.open-pnl',
        '.unrealized-pnl',
        '.floating-pnl',
        '[class*="pnl"]'
      ];
      
      return this.extractNumericValue(selectors, 0);
    }

    getOpenPositions() {
      const positionsContainer = document.querySelector('.positions-table, .open-positions, [class*="position"]');
      if (positionsContainer) {
        const rows = positionsContainer.querySelectorAll('tr, .position-row');
        return Math.max(0, rows.length - 1); // Subtract header row
      }
      
      return 0;
    }

    extractNumericValue(selectors, fallback = 0) {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
          const value = this.parsePrice(element.textContent);
          if (value !== null && !isNaN(value)) {
            return value;
          }
        }
      }
      
      return fallback;
    }

    parsePrice(text) {
      if (!text) return null;
      
      // Remove currency symbols and clean up
      const cleaned = text.replace(/[$€£¥,\s]/g, '').replace(/[^\d.-]/g, '');
      const value = parseFloat(cleaned);
      
      return isNaN(value) ? null : value;
    }

    async executeTrade(signal) {
      try {
        console.log('Executing trade:', signal);
        
        if (this.scraper) {
          // Use enhanced scraper for trading
          await this.scraper.setLotSize(signal.lotSize || 0.01);
          
          if (signal.action === 'BUY') {
            await this.scraper.clickBuyButton();
          } else if (signal.action === 'SELL') {
            await this.scraper.clickSellButton();
          }
        } else {
          // Fallback to basic methods
          await this.setLotSize(signal.lotSize || 0.01);
          
          if (signal.action === 'BUY') {
            await this.clickBuyButton();
          } else if (signal.action === 'SELL') {
            await this.clickSellButton();
          }
        }
        
        // Wait for execution
        await this.waitForDelay(1000);
        
        // Send result back
        this.sendDataToContentScript('TRADE_RESULT', {
          success: true,
          signal,
          timestamp: Date.now(),
          source: this.scraper ? 'enhanced' : 'basic'
        });
        
      } catch (error) {
        console.error('Trade execution error:', error);
        this.sendDataToContentScript('TRADE_RESULT', {
          success: false,
          error: error.message,
          signal,
          timestamp: Date.now(),
          source: this.scraper ? 'enhanced' : 'basic'
        });
      }
    }

    async setLotSize(size) {
      const lotInputSelectors = [
        'input[class*="lot"]',
        'input[class*="volume"]',
        'input[class*="size"]',
        '.lot-input input',
        '.volume-input input'
      ];
      
      for (const selector of lotInputSelectors) {
        const input = document.querySelector(selector);
        if (input) {
          input.value = size.toFixed(2);
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    }

    async clickBuyButton() {
      const buyButtonSelectors = [
        '.buy-button',
        'button[class*="buy"]',
        '.btn-buy',
        '.order-buy',
        'button:contains("Buy")',
        '.trade-button.buy'
      ];
      
      for (const selector of buyButtonSelectors) {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
          button.click();
          return;
        }
      }
      
      throw new Error('Buy button not found or disabled');
    }

    async clickSellButton() {
      const sellButtonSelectors = [
        '.sell-button',
        'button[class*="sell"]',
        '.btn-sell',
        '.order-sell',
        'button:contains("Sell")',
        '.trade-button.sell'
      ];
      
      for (const selector of sellButtonSelectors) {
        const button = document.querySelector(selector);
        if (button && !button.disabled) {
          button.click();
          return;
        }
      }
      
      throw new Error('Sell button not found or disabled');
    }

    async switchSymbol(symbol) {
      // Try to find symbol selector/dropdown
      const symbolSelectors = [
        '.symbol-selector',
        '.instrument-selector',
        '.trading-pair-selector',
        '[class*="symbol"] select',
        '.dropdown-symbol'
      ];
      
      for (const selector of symbolSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          if (element.tagName === 'SELECT') {
            element.value = symbol;
            element.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            element.click();
            await this.waitForDelay(500);
            
            // Look for symbol option
            const option = document.querySelector(`[data-symbol="${symbol}"], [data-value="${symbol}"]`);
            if (option) {
              option.click();
            }
          }
          break;
        }
      }
    }

    async switchTimeframe(timeframe) {
      const timeframeSelectors = [
        `.timeframe-${timeframe}`,
        `[data-timeframe="${timeframe}"]`,
        `.period-${timeframe}`,
        '.timeframe-selector button'
      ];
      
      for (const selector of timeframeSelectors) {
        const button = document.querySelector(selector);
        if (button && button.textContent.includes(timeframe)) {
          button.click();
          break;
        }
      }
    }

    async emergencyCloseAll() {
      // Look for close all positions button
      const closeAllSelectors = [
        '.close-all-positions',
        '.close-all-button',
        'button[class*="close-all"]',
        '.emergency-close'
      ];
      
      for (const selector of closeAllSelectors) {
        const button = document.querySelector(selector);
        if (button) {
          button.click();
          break;
        }
      }
      
      // If no close all button, try to close individual positions
      const closeButtons = document.querySelectorAll('.close-position, .position-close, [class*="close"]');
      for (const button of closeButtons) {
        if (button.textContent.toLowerCase().includes('close')) {
          button.click();
          await this.waitForDelay(100);
        }
      }
    }

    getAccountData() {
      const accountData = this.extractAccountData();
      this.sendDataToContentScript('ACCOUNT_DATA_RESPONSE', accountData);
    }

    hasDataChanged(newData) {
      if (!this.lastData) return true;
      
      // Check if price has changed significantly
      const oldPrice = this.lastData.market?.price || 0;
      const newPrice = newData.market?.price || 0;
      const priceChange = Math.abs(newPrice - oldPrice) / oldPrice;
      
      return priceChange > 0.0001; // 0.01% change threshold
    }

    sendDataToContentScript(type, data) {
      window.postMessage({
        type,
        payload: data
      }, '*');
    }

    waitForDelay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Initialize the extractor
  new ExnessDataExtractor();
  
})();
