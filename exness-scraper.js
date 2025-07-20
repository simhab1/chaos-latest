export class ExnessScraper {
  constructor() {
    this.platform = 'unknown';
    this.selectors = {};
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    
    this.init();
  }

  init() {
    this.detectPlatform();
    this.setupSelectors();
    this.isInitialized = true;
    console.log('ExnessScraper initialized for platform:', this.platform);
  }

  detectPlatform() {
    // Detect Exness platform type based on DOM elements and URL
    const url = window.location.href;
    
    if (url.includes('my.exness.global/webtrading')) {
      this.platform = 'ExnessGlobalWeb';
    } else if (document.querySelector('.mt4-terminal') || document.querySelector('[class*="mt4"]')) {
      this.platform = 'MT4';
    } else if (document.querySelector('.mt5-terminal') || document.querySelector('[class*="mt5"]')) {
      this.platform = 'MT5';
    } else if (document.querySelector('.web-terminal') || document.querySelector('[id*="terminal"]')) {
      this.platform = 'WebTerminal';
    } else if (document.querySelector('.trading-view') || document.querySelector('[class*="tradingview"]')) {
      this.platform = 'TradingView';
    } else {
      this.platform = 'Exness';
    }
  }

  setupSelectors() {
    // Define selectors based on actual Exness platform structure
    // Enhanced for Exness Global WebTrading platform
    this.selectors = {
      // Price and symbol selectors - Updated for Exness Global
      currentPrice: [
        '.price-display',
        '.current-price',
        '.quote-price',
        '.last-price',
        '[class*="price"]:not([class*="change"])',
        '.symbol-price',
        '.bid-price',
        '.ask-price',
        // Exness Global specific selectors
        '[data-testid="price"]',
        '[class*="Price"]',
        '.trading-panel .price',
        '.instrument-price',
        '.quote-container .price'
      ],
      
      symbol: [
        '.symbol-name',
        '.current-symbol',
        '.instrument-name',
        '.trading-pair',
        '.symbol-display',
        '[class*="symbol"]:not([class*="price"])',
        '.pair-name',
        // Exness Global specific selectors
        '[data-testid="symbol"]',
        '[class*="Symbol"]',
        '.trading-panel .symbol',
        '.instrument-selector .selected',
        '.active-instrument'
      ],
      
      // Account information selectors - Enhanced for Exness Global
      balance: [
        '.account-balance',
        '.balance-amount',
        '.acc-balance',
        '[class*="balance"]',
        '.wallet-balance',
        '.account-info .balance',
        // Exness Global specific selectors
        '[data-testid="balance"]',
        '[class*="Balance"]',
        '.account-panel .balance',
        '.trading-account .balance',
        '.portfolio-balance'
      ],
      
      equity: [
        '.account-equity',
        '.equity-amount',
        '.acc-equity',
        '[class*="equity"]',
        '.account-info .equity'
      ],
      
      margin: [
        '.used-margin',
        '.margin-used',
        '.acc-margin',
        '[class*="margin"]:not([class*="free"])',
        '.account-info .margin'
      ],
      
      freeMargin: [
        '.free-margin',
        '.margin-free',
        '.available-margin',
        '[class*="free-margin"]',
        '.account-info .free-margin'
      ],
      
      // Trading button selectors - Enhanced for Exness Global
      buyButton: [
        '.buy-button',
        '.btn-buy',
        '.order-buy',
        'button[class*="buy"]',
        '.trade-button.buy',
        '.trading-buttons .buy',
        '[data-action="buy"]',
        // Exness Global specific selectors
        '[data-testid="buy-button"]',
        '[class*="BuyButton"]',
        '.trading-panel .buy',
        'button[class*="Buy"]',
        '.order-buttons .buy'
      ],
      
      sellButton: [
        '.sell-button',
        '.btn-sell',
        '.order-sell',
        'button[class*="sell"]',
        '.trade-button.sell',
        '.trading-buttons .sell',
        '[data-action="sell"]',
        // Exness Global specific selectors
        '[data-testid="sell-button"]',
        '[class*="SellButton"]',
        '.trading-panel .sell',
        'button[class*="Sell"]',
        '.order-buttons .sell'
      ],
      
      // Lot size input selectors
      lotSizeInput: [
        'input[class*="lot"]',
        'input[class*="volume"]',
        'input[class*="size"]',
        '.lot-input input',
        '.volume-input input',
        '.size-input input',
        'input[name*="lot"]',
        'input[name*="volume"]'
      ],
      
      // Position and trade selectors
      positionsTable: [
        '.positions-table',
        '.open-positions',
        '.trades-table',
        '[class*="position"]:has(table)',
        '.account-positions',
        '.trading-positions'
      ],
      
      positionRows: [
        '.position-row',
        '.trade-row',
        'tr[class*="position"]',
        'tr[class*="trade"]',
        '.positions-table tr:not(.header)'
      ],
      
      // Symbol selector
      symbolSelector: [
        '.symbol-selector',
        '.instrument-selector',
        '.pair-selector',
        '[class*="symbol"] select',
        '.trading-pair-selector',
        '.market-selector'
      ],
      
      // Timeframe selector
      timeframeSelector: [
        '.timeframe-selector',
        '.period-selector',
        '.tf-selector',
        '[class*="timeframe"]',
        '.chart-timeframe'
      ],
      
      // Chart container
      chartContainer: [
        '.chart-container',
        '.trading-chart',
        '.price-chart',
        '#chart',
        '.chart-widget',
        '[class*="chart"]:has(canvas)'
      ]
    };
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
    const priceText = this.extractTextFromSelectors(this.selectors.currentPrice);
    return this.parseNumericValue(priceText) || 0;
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
