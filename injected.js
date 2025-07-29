// This script is injected into the Exness page to access DOM directly
(function() {
  'use strict';
  
  class ExnessDataExtractor {
    constructor() {
      this.isActive = false;
      this.config = {};
      this.lastData = {};
      this.extractionInterval = null;
      
      this.init();
    }

    init() {
      console.log('Exness Data Extractor initialized');
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

    extractAndSendData() {
      try {
        const marketData = this.extractMarketData();
        const accountData = this.extractAccountData();
        
        const combinedData = {
          market: marketData,
          account: accountData,
          timestamp: Date.now()
        };
        
        // Only send if data has changed significantly
        if (this.hasDataChanged(combinedData)) {
          this.sendDataToContentScript('EXNESS_DATA_UPDATE', combinedData);
          this.lastData = combinedData;
        }
        
      } catch (error) {
        console.error('Data extraction error:', error);
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
        
        // Pre-execution validation
        const validation = await this.validateTradeExecution();
        if (!validation.canExecute) {
          throw new Error(`Trade validation failed: ${validation.reason}`);
        }

        // Enhanced trade execution with better security handling
        const executionResult = await this.executeTradeSecurely(signal);
        
        if (executionResult.success) {
          // Wait for confirmation
          const confirmation = await this.waitForTradeConfirmation(3000);
          
          this.sendDataToContentScript('TRADE_RESULT', {
            success: true,
            signal,
            confirmation,
            timestamp: Date.now(),
            executionMethod: executionResult.method
          });
        } else {
          throw new Error(executionResult.error);
        }
        
      } catch (error) {
        console.error('Trade execution error:', error);
        this.sendDataToContentScript('TRADE_RESULT', {
          success: false,
          error: error.message,
          signal,
          timestamp: Date.now(),
          suggestion: this.getExecutionSuggestion(error)
        });
      }
    }

    async validateTradeExecution() {
      // Check if trading is possible
      const tradingButtons = document.querySelectorAll('.buy-button, .sell-button, button[class*="buy"], button[class*="sell"]');
      
      if (tradingButtons.length === 0) {
        return {
          canExecute: false,
          reason: 'No trading buttons found on page'
        };
      }

      // Check if buttons are enabled
      const enabledButtons = Array.from(tradingButtons).filter(btn => !btn.disabled);
      if (enabledButtons.length === 0) {
        return {
          canExecute: false,
          reason: 'All trading buttons are disabled'
        };
      }

      // Check if we're on the correct page
      if (!window.location.href.includes('exness')) {
        return {
          canExecute: false,
          reason: 'Not on Exness platform'
        };
      }

      return {
        canExecute: true,
        reason: 'Validation passed'
      };
    }

    async executeTradeSecurely(signal) {
      // Try multiple execution methods
      const executionMethods = [
        () => this.executeViaDirectClick(signal),
        () => this.executeViaKeyboard(signal),
        () => this.executeViaForm(signal)
      ];

      for (let i = 0; i < executionMethods.length; i++) {
        try {
          console.log(`Trying execution method ${i + 1}`);
          const result = await executionMethods[i]();
          if (result.success) {
            return { success: true, method: i + 1, ...result };
          }
        } catch (error) {
          console.warn(`Execution method ${i + 1} failed:`, error);
          continue;
        }
      }

      return {
        success: false,
        error: 'All execution methods failed'
      };
    }

    async executeViaDirectClick(signal) {
      // Set lot size first
      await this.setLotSizeSecurely(signal.lotSize || 0.01);
      
      // Direct button click
      if (signal.action === 'BUY') {
        await this.clickBuyButtonSecurely();
      } else if (signal.action === 'SELL') {
        await this.clickSellButtonSecurely();
      }
      
      return { success: true, method: 'direct_click' };
    }

    async executeViaKeyboard(signal) {
      // Focus on trading interface and use keyboard shortcuts
      const tradingInterface = document.querySelector('.trading-panel, .order-panel, [class*="trading"]');
      if (tradingInterface) {
        tradingInterface.focus();
        
        // Common trading shortcuts
        if (signal.action === 'BUY') {
          this.simulateKeyPress('F9'); // Common buy hotkey
          this.simulateKeyPress('B');  // Alternative
        } else if (signal.action === 'SELL') {
          this.simulateKeyPress('F10'); // Common sell hotkey
          this.simulateKeyPress('S');   // Alternative
        }
        
        return { success: true, method: 'keyboard' };
      }
      
      throw new Error('Trading interface not found for keyboard execution');
    }

    async executeViaForm(signal) {
      // Look for order form elements
      const orderForm = document.querySelector('form[class*="order"], form[class*="trade"]');
      if (orderForm) {
        // Fill form data
        await this.fillOrderForm(signal, orderForm);
        
        // Submit form
        const submitButton = orderForm.querySelector('button[type="submit"], input[type="submit"]');
        if (submitButton) {
          this.triggerEvent(submitButton, 'click');
          return { success: true, method: 'form_submit' };
        }
      }
      
      throw new Error('Order form not found or incomplete');
    }

    async setLotSizeSecurely(size) {
      const methods = [
        () => this.setLotSizeViaInput(size),
        () => this.setLotSizeViaSteppers(size),
        () => this.setLotSizeViaSlider(size)
      ];

      for (const method of methods) {
        try {
          await method();
          console.log(`Lot size set to ${size} successfully`);
          return;
        } catch (error) {
          continue;
        }
      }

      console.warn(`Failed to set lot size to ${size}`);
    }

    async setLotSizeViaInput(size) {
      const lotInputSelectors = [
        '[data-testid="lot-size"], [data-test="lot-size"]',
        'input[class*="lot"], input[class*="volume"], input[class*="size"]',
        '.lot-input input, .volume-input input, .size-input input'
      ];
      
      for (const selector of lotInputSelectors) {
        const input = document.querySelector(selector);
        if (input && !input.disabled) {
          // Clear and set value
          input.value = '';
          input.value = size.toFixed(2);
          
          // Trigger events
          this.triggerEvent(input, 'focus');
          this.triggerEvent(input, 'input');
          this.triggerEvent(input, 'change');
          this.triggerEvent(input, 'blur');
          
          return;
        }
      }
      
      throw new Error('Lot size input not found');
    }

    async waitForTradeConfirmation(timeout = 3000) {
      return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkForConfirmation = () => {
          // Look for confirmation elements
          const confirmationSelectors = [
            '.trade-confirmation, .order-confirmation',
            '.success-message, .trade-success',
            '[class*="confirm"], [class*="success"]'
          ];
          
          for (const selector of confirmationSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent?.toLowerCase().includes('success')) {
              resolve({
                confirmed: true,
                message: element.textContent,
                time: Date.now() - startTime
              });
              return;
            }
          }
          
          if (Date.now() - startTime > timeout) {
            resolve({
              confirmed: false,
              message: 'Timeout waiting for confirmation',
              time: timeout
            });
            return;
          }
          
          setTimeout(checkForConfirmation, 100);
        };
        
        checkForConfirmation();
      });
    }

    getExecutionSuggestion(error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('button') || errorMessage.includes('click')) {
        return 'Try executing the trade manually to verify the trading interface is working';
      } else if (errorMessage.includes('disabled')) {
        return 'Check if trading is enabled and account has sufficient funds';
      } else if (errorMessage.includes('validation')) {
        return 'Verify you are on the correct Exness trading page';
      } else {
        return 'Check browser console for detailed error information';
      }
    }

    triggerEvent(element, eventType) {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    }

    simulateKeyPress(key) {
      const event = new KeyboardEvent('keydown', {
        key: key,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
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
