export class ExnessScraper {
  constructor() {
    this.platform = 'unknown';
    this.selectors = {};
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.dynamicSelectors = new Map(); // Cache for discovered selectors
    this.selectorAttempts = new Map(); // Track failed selectors
    
    this.init();
  }

  init() {
    this.detectPlatform();
    this.setupSelectors();
    this.discoverDynamicSelectors();
    this.isInitialized = true;
    console.log('ExnessScraper initialized for platform:', this.platform);
  }

  detectPlatform() {
    // Enhanced platform detection with multiple checks
    const url = window.location.href;
    const domain = window.location.hostname;
    
    // Check URL patterns first
    if (url.includes('my.exness.global/webtrading') || url.includes('trade.exness.global')) {
      this.platform = 'ExnessGlobalWeb';
    } else if (url.includes('my.exness.com/webtrading') || url.includes('trade.exness.com')) {
      this.platform = 'ExnessWeb';
    } else if (domain.includes('exness')) {
      // Check for specific platform indicators in DOM
      if (this.waitForElement('.mt4-terminal, [class*="mt4"], [id*="mt4"]', 1000)) {
        this.platform = 'MT4';
      } else if (this.waitForElement('.mt5-terminal, [class*="mt5"], [id*="mt5"]', 1000)) {
        this.platform = 'MT5';
      } else if (this.waitForElement('.web-terminal, [id*="terminal"], [class*="trading"]', 1000)) {
        this.platform = 'WebTerminal';
      } else {
        this.platform = 'ExnessGeneric';
      }
    } else {
      this.platform = 'Unknown';
    }
    
    console.log(`Platform detected: ${this.platform} on ${domain}`);
  }

  setupSelectors() {
    // Enhanced selectors with more comprehensive fallbacks
    this.selectors = {
      // Price selectors - Enhanced with data attributes and modern selectors
      currentPrice: [
        // Exness Global specific
        '[data-testid="price"], [data-test="price"], [data-qa="price"]',
        '[class*="Price"]:not([class*="Change"])',
        '[class*="quote"] [class*="price"]',
        '.trading-panel [class*="price"]',
        '.instrument-price, .symbol-price',
        
        // Generic fallbacks
        '.price-display, .current-price, .quote-price, .last-price',
        '.bid-price, .ask-price',
        '[class*="price"]:not([class*="change"]):not([class*="diff"])',
        
        // Dynamic discovery
        'span:contains("$"), span:contains("€"), span:contains("£")',
        '[class*="rate"], [class*="quote"]',
        '.trading-info .value, .market-data .value'
      ],
      
      symbol: [
        // Enhanced symbol detection
        '[data-testid="symbol"], [data-test="symbol"], [data-qa="symbol"]',
        '[data-testid="instrument"], [data-test="instrument"]',
        '.instrument-selector .selected, .symbol-selector .selected',
        '.active-instrument, .current-symbol, .selected-symbol',
        '[class*="Symbol"]:not([class*="Price"])',
        '.trading-panel [class*="symbol"], .trading-panel [class*="instrument"]',
        
        // Generic fallbacks  
        '.symbol-name, .instrument-name, .trading-pair, .pair-name',
        '.symbol-display, [class*="symbol"]:not([class*="price"])',
        '.chart-header .symbol, .trading-header .symbol'
      ],
      
      // Account selectors with enhanced detection
      balance: [
        '[data-testid="balance"], [data-test="balance"], [data-qa="balance"]',
        '[data-testid="account-balance"], [data-test="account-balance"]',
        '.account-balance, .balance-amount, .acc-balance',
        '.wallet-balance, .portfolio-balance',
        '[class*="Balance"]:not([class*="Change"])',
        '.account-panel [class*="balance"], .trading-account [class*="balance"]',
        '.account-info .balance, .user-info .balance',
        '.balance-value, .balance-display'
      ],
      
      equity: [
        '[data-testid="equity"], [data-test="equity"], [data-qa="equity"]',
        '.account-equity, .equity-amount, .acc-equity',
        '[class*="Equity"], [class*="equity"]',
        '.account-info .equity, .portfolio-equity'
      ],
      
      margin: [
        '[data-testid="margin"], [data-test="margin"], [data-qa="margin"]',
        '.account-margin, .margin-amount, .acc-margin',
        '[class*="Margin"], [class*="margin"]',
        '.account-info .margin, .trading-info .margin'
      ],
      
      // Trading interface selectors
      buyButton: [
        '[data-testid="buy-button"], [data-test="buy-button"]',
        '.buy-button, .btn-buy, .order-buy',
        'button[class*="buy"]:not([disabled])',
        '.trade-button.buy, .trading-button.buy',
        'button:contains("Buy"), button:contains("BUY")',
        '.order-panel .buy, .trading-panel .buy'
      ],
      
      sellButton: [
        '[data-testid="sell-button"], [data-test="sell-button"]',
        '.sell-button, .btn-sell, .order-sell',
        'button[class*="sell"]:not([disabled])',
        '.trade-button.sell, .trading-button.sell',
        'button:contains("Sell"), button:contains("SELL")',
        '.order-panel .sell, .trading-panel .sell'
      ],
      
      lotSizeInput: [
        '[data-testid="lot-size"], [data-test="lot-size"], [data-qa="volume"]',
        'input[class*="lot"], input[class*="volume"], input[class*="size"]',
        '.lot-input input, .volume-input input, .size-input input',
        '.order-panel input[type="number"], .trading-panel input[type="number"]',
        'input[placeholder*="lot"], input[placeholder*="volume"]'
      ]
    };
  }

  async discoverDynamicSelectors() {
    // Discover selectors by analyzing the DOM structure
    try {
      // Look for trading interface containers
      const tradingContainers = document.querySelectorAll('[class*="trading"], [class*="order"], [class*="trade"]');
      
      for (const container of tradingContainers) {
        // Discover price elements by looking for numeric content with currency patterns
        const priceElements = container.querySelectorAll('*');
        for (const element of priceElements) {
          const text = element.textContent?.trim();
          if (text && /^\d+[\.,]\d+$/.test(text) && parseFloat(text.replace(',', '.')) > 0) {
            this.addDynamicSelector('discoveredPrice', this.getElementSelector(element));
          }
        }
        
        // Discover buttons by text content
        const buttons = container.querySelectorAll('button, [role="button"]');
        for (const button of buttons) {
          const text = button.textContent?.toLowerCase().trim();
          if (text?.includes('buy')) {
            this.addDynamicSelector('discoveredBuy', this.getElementSelector(button));
          } else if (text?.includes('sell')) {
            this.addDynamicSelector('discoveredSell', this.getElementSelector(button));
          }
        }
      }
    } catch (error) {
      console.warn('Dynamic selector discovery failed:', error);
    }
  }

  addDynamicSelector(type, selector) {
    if (!this.dynamicSelectors.has(type)) {
      this.dynamicSelectors.set(type, []);
    }
    this.dynamicSelectors.get(type).push(selector);
  }

  getElementSelector(element) {
    // Generate a CSS selector for an element
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
      
      if (current.className) {
        const classes = current.className.split(/\s+/).filter(c => c.length > 0);
        if (classes.length > 0) {
          selector += '.' + classes.slice(0, 2).join('.');
        }
      }
      
      // Add position if multiple similar elements
      const siblings = Array.from(current.parentNode?.children || []);
      const sameTag = siblings.filter(s => s.tagName === current.tagName);
      if (sameTag.length > 1) {
        const index = sameTag.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
    }
    
    return path.join(' > ');
  }

  async waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          observer.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  // Main scraping methods
  async scrapeMarketData() {
    try {
      const data = {
        symbol: this.extractSymbol(),
        price: this.extractCurrentPrice(),
        bid: this.extractBidPrice(),
        ask: this.extractAskPrice(),
        spread: this.extractSpread(),
        timeframe: this.extractTimeframe(),
        candles: await this.extractCandleData(),
        volume: this.extractVolume(),
        timestamp: Date.now()
      };

      return data;
    } catch (error) {
      console.error('Error scraping market data:', error);
      return this.getEmptyMarketData();
    }
  }

  async scrapeAccountData() {
    try {
      const data = {
        balance: this.extractBalance(),
        equity: this.extractEquity(),
        margin: this.extractMargin(),
        freeMargin: this.extractFreeMargin(),
        marginLevel: this.extractMarginLevel(),
        openPnl: this.extractOpenPnL(),
        openPositions: this.extractOpenPositions(),
        todayPnl: this.extractTodayPnL(),
        totalPnl: this.extractTotalPnL(),
        currency: this.extractAccountCurrency(),
        timestamp: Date.now()
      };

      return data;
    } catch (error) {
      console.error('Error scraping account data:', error);
      return this.getEmptyAccountData();
    }
  }

  // Symbol and price extraction
  extractSymbol() {
    return this.extractTextFromSelectors(this.selectors.symbol)?.replace(/[^A-Z]/g, '') || 'BTCUSD';
  }

  extractCurrentPrice() {
    // Try primary selectors first
    let priceText = this.extractTextFromSelectors(this.selectors.currentPrice);
    let price = this.parseNumericValue(priceText);
    
    if (price && price > 0) {
      return price;
    }

    // Try dynamic selectors if available
    const dynamicPriceSelectors = this.dynamicSelectors.get('discoveredPrice') || [];
    for (const selector of dynamicPriceSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          price = this.parseNumericValue(element.textContent);
          if (price && price > 0) {
            console.log(`Price found using dynamic selector: ${selector} = ${price}`);
            return price;
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Advanced fallback - pattern matching
    const textContent = document.body.textContent || '';
    const pricePatterns = [
      /(\d{1,6}[\.,]\d{2,5})/g,  // Standard price pattern
      /([£$€¥]?\s*\d+[\.,]\d{2,5})/g // Currency prefixed
    ];

    for (const pattern of pricePatterns) {
      const matches = textContent.match(pattern);
      if (matches) {
        for (const match of matches) {
          price = this.parseNumericValue(match);
          if (price && price > 0.001 && price < 100000) {
            console.log(`Price found via pattern matching: ${price}`);
            return price;
          }
        }
      }
    }

    return 0;
  }

  extractBidPrice() {
    const selectors = ['.bid-price', '.bid', '[class*="bid"]'];
    const bidText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(bidText) || 0;
  }

  extractAskPrice() {
    const selectors = ['.ask-price', '.ask', '[class*="ask"]'];
    const askText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(askText) || 0;
  }

  extractSpread() {
    const bid = this.extractBidPrice();
    const ask = this.extractAskPrice();
    return ask && bid ? Math.abs(ask - bid) : 0;
  }

  extractTimeframe() {
    const selectors = [
      '.timeframe-selector .active',
      '.period-selector .selected',
      '[class*="timeframe"].active',
      '.tf-selected'
    ];
    return this.extractTextFromSelectors(selectors) || 'M15';
  }

  // Account data extraction
  extractBalance() {
    const balanceText = this.extractTextFromSelectors(this.selectors.balance);
    return this.parseNumericValue(balanceText) || 0;
  }

  extractEquity() {
    const equityText = this.extractTextFromSelectors(this.selectors.equity);
    return this.parseNumericValue(equityText) || 0;
  }

  extractMargin() {
    const marginText = this.extractTextFromSelectors(this.selectors.margin);
    return this.parseNumericValue(marginText) || 0;
  }

  extractFreeMargin() {
    const freeMarginText = this.extractTextFromSelectors(this.selectors.freeMargin);
    return this.parseNumericValue(freeMarginText) || 0;
  }

  extractMarginLevel() {
    const selectors = ['.margin-level', '.margin-percentage', '[class*="margin-level"]'];
    const levelText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(levelText) || 0;
  }

  extractOpenPnL() {
    const selectors = ['.open-pnl', '.unrealized-pnl', '.floating-pnl', '[class*="pnl"]'];
    const pnlText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(pnlText) || 0;
  }

  extractTodayPnL() {
    const selectors = ['.today-pnl', '.daily-pnl', '[class*="today"]', '[class*="daily"]'];
    const pnlText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(pnlText) || 0;
  }

  extractTotalPnL() {
    const selectors = ['.total-pnl', '.overall-pnl', '[class*="total"]'];
    const pnlText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(pnlText) || 0;
  }

  extractOpenPositions() {
    const positionsContainer = this.findElementFromSelectors(this.selectors.positionsTable);
    if (positionsContainer) {
      const rows = positionsContainer.querySelectorAll('tr, .position-row, .trade-row');
      return Math.max(0, rows.length - 1); // Subtract header row
    }
    return 0;
  }

  extractAccountCurrency() {
    const selectors = ['.account-currency', '.currency', '[class*="currency"]'];
    return this.extractTextFromSelectors(selectors) || 'USD';
  }

  // Volume and chart data extraction
  extractVolume() {
    const selectors = ['.volume-display', '.current-volume', '[class*="volume"]'];
    const volumeText = this.extractTextFromSelectors(selectors);
    return this.parseNumericValue(volumeText) || 0;
  }

  async extractCandleData() {
    // Try to extract candle data from chart
    const chartContainer = this.findElementFromSelectors(this.selectors.chartContainer);
    
    if (chartContainer) {
      // Look for canvas elements that might contain chart data
      const canvases = chartContainer.querySelectorAll('canvas');
      
      if (canvases.length > 0) {
        // For now, return synthetic data structure
        // Real implementation would need to parse canvas or access chart API
        return this.generateFallbackCandles();
      }
    }
    
    return this.generateFallbackCandles();
  }

  generateFallbackCandles() {
    // Generate realistic candle structure based on current price
    const basePrice = this.extractCurrentPrice() || 50000;
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

  // Trading action methods
  async setLotSize(size) {
    const input = this.findElementFromSelectors(this.selectors.lotSizeInput);
    if (input) {
      input.value = size.toFixed(2);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await this.waitForDelay(100);
      return true;
    }
    return false;
  }

  async clickBuyButton() {
    const button = this.findElementFromSelectors(this.selectors.buyButton);
    if (button && !button.disabled) {
      button.click();
      await this.waitForDelay(100);
      return true;
    }
    throw new Error('Buy button not found or disabled');
  }

  async clickSellButton() {
    const button = this.findElementFromSelectors(this.selectors.sellButton);
    if (button && !button.disabled) {
      button.click();
      await this.waitForDelay(100);
      return true;
    }
    throw new Error('Sell button not found or disabled');
  }

  async switchSymbol(symbol) {
    const selector = this.findElementFromSelectors(this.selectors.symbolSelector);
    
    if (selector) {
      if (selector.tagName === 'SELECT') {
        // Handle dropdown select
        const option = Array.from(selector.options).find(opt => 
          opt.text.includes(symbol) || opt.value.includes(symbol)
        );
        if (option) {
          selector.value = option.value;
          selector.dispatchEvent(new Event('change', { bubbles: true }));
          await this.waitForDelay(1000);
          return true;
        }
      } else {
        // Handle clickable selector
        selector.click();
        await this.waitForDelay(500);
        
        // Look for symbol option in dropdown
        const option = document.querySelector(`[data-symbol="${symbol}"], [data-value="${symbol}"]`);
        if (option) {
          option.click();
          await this.waitForDelay(1000);
          return true;
        }
      }
    }
    
    return false;
  }

  async switchTimeframe(timeframe) {
    const selectors = [
      `.timeframe-${timeframe}`,
      `[data-timeframe="${timeframe}"]`,
      `.period-${timeframe}`,
      '.timeframe-selector button'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.includes(timeframe)) {
        element.click();
        await this.waitForDelay(500);
        return true;
      }
    }
    
    return false;
  }

  // Utility methods
  findElementFromSelectors(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }

  extractTextFromSelectors(selectors) {
    const element = this.findElementFromSelectors(selectors);
    return element ? element.textContent.trim() : null;
  }

  parseNumericValue(text) {
    if (!text) return null;
    
    // Remove currency symbols and clean up
    const cleaned = text.replace(/[$€£¥,\s]/g, '').replace(/[^\d.-]/g, '');
    const value = parseFloat(cleaned);
    
    return isNaN(value) ? null : value;
  }

  waitForDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Validation methods
  validateMarketData(data) {
    return data && 
           data.symbol && 
           typeof data.price === 'number' && 
           data.price > 0;
  }

  validateAccountData(data) {
    return data && 
           typeof data.balance === 'number' && 
           data.balance >= 0;
  }

  // Fallback data methods
  getEmptyMarketData() {
    return {
      symbol: 'BTCUSD',
      price: 0,
      bid: 0,
      ask: 0,
      spread: 0,
      timeframe: 'M15',
      candles: [],
      volume: 0,
      timestamp: Date.now()
    };
  }

  getEmptyAccountData() {
    return {
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      marginLevel: 0,
      openPnl: 0,
      openPositions: 0,
      todayPnl: 0,
      totalPnl: 0,
      currency: 'USD',
      timestamp: Date.now()
    };
  }

  // Enhanced error handling and retry logic
  async retryOperation(operation, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error);
        if (i === maxRetries - 1) throw error;
        await this.waitForDelay(1000 * (i + 1)); // Exponential backoff
      }
    }
  }

  // Debug and monitoring methods
  logScrapingActivity(action, result) {
    console.log(`[ExnessScraper] ${action}:`, result);
  }

  getScrapingStats() {
    return {
      platform: this.platform,
      isInitialized: this.isInitialized,
      retryCount: this.retryCount,
      lastActivity: Date.now()
    };
  }
}
