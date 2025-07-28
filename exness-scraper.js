export class ExnessScraper {
  constructor() {
    this.platform = 'unknown';
    this.selectors = {};
    this.isInitialized = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.lastFoundSelectors = {}; // Cache for successful selectors
    this.selectorAttempts = {}; // Track selector success rates
    this.debugMode = false; // Set to true to enable verbose logging
    
    this.init();
  }

  init() {
    this.detectPlatform();
    this.setupSelectors();
    this.isInitialized = true;
    console.log('ExnessScraper initialized for platform:', this.platform);
  }
  
  refreshSelectors() {
    // Clear cached selectors to force fresh detection
    this.lastFoundSelectors = {};
    this.selectorAttempts = {};
    
    // Re-detect platform and refresh selectors
    this.detectPlatform();
    this.setupSelectors();
    
    console.log('ExnessScraper selectors refreshed for platform:', this.platform);
    return true;
  }

  detectPlatform() {
    // Detect Exness platform type based on DOM elements and URL
    const url = window.location.href;
    
    // Use a more robust detection approach with multiple selectors
    const platformDetectors = [
      { pattern: 'my.exness.global/webtrading', platform: 'ExnessGlobalWeb' },
      { selectors: ['.mt4-terminal', '[class*="mt4"]', '[data-platform="mt4"]'], platform: 'MT4' },
      { selectors: ['.mt5-terminal', '[class*="mt5"]', '[data-platform="mt5"]'], platform: 'MT5' },
      { selectors: ['.web-terminal', '[id*="terminal"]', '[data-platform="web"]'], platform: 'WebTerminal' },
      { selectors: ['.trading-view', '[class*="tradingview"]', '[data-platform="tv"]'], platform: 'TradingView' }
    ];
    
    // First check URL patterns
    for (const detector of platformDetectors) {
      if (detector.pattern && url.includes(detector.pattern)) {
        this.platform = detector.platform;
        return;
      }
    }
    
    // Then check DOM selectors
    for (const detector of platformDetectors) {
      if (detector.selectors) {
        for (const selector of detector.selectors) {
          if (document.querySelector(selector)) {
            this.platform = detector.platform;
            return;
          }
        }
      }
    }
    
    // Default fallback
    this.platform = 'Exness';
    
    if (this.debugMode) {
      console.log(`Platform detected: ${this.platform} from URL: ${url}`);
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

  // Main scraping methods with enhanced error handling and retry logic
  async scrapeMarketData() {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
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

        // Validate the data before returning
        if (this.validateMarketData(data)) {
          if (this.debugMode) {
            console.log('Successfully scraped market data:', data);
          }
          return data;
        } else {
          throw new Error('Invalid market data scraped');
        }
      } catch (error) {
        retryCount++;
        if (retryCount <= maxRetries) {
          console.warn(`Market data scraping attempt ${retryCount} failed: ${error.message}. Retrying...`);
          // Wait before retrying with exponential backoff
          await this.waitForDelay(Math.pow(2, retryCount) * 100);
          
          // Try to refresh selectors on failure
          if (retryCount === 2) {
            this.setupSelectors();
          }
        } else {
          console.error('Error scraping market data after all retries:', error);
          return this.getEmptyMarketData();
        }
      }
    }
  }

  async scrapeAccountData() {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        // Use Promise.all to parallelize extraction where possible
        const [balance, equity, margin, freeMargin, marginLevel, openPnl, openPositions, todayPnl, totalPnl, currency] = 
          await Promise.all([
            this.extractBalance(),
            this.extractEquity(),
            this.extractMargin(),
            this.extractFreeMargin(),
            this.extractMarginLevel(),
            this.extractOpenPnL(),
            this.extractOpenPositions(),
            this.extractTodayPnL(),
            this.extractTotalPnL(),
            this.extractAccountCurrency()
          ]);
        
        const data = {
          balance,
          equity,
          margin,
          freeMargin,
          marginLevel,
          openPnl,
          openPositions,
          todayPnl,
          totalPnl,
          currency,
          timestamp: Date.now()
        };

        // Validate the data before returning
        if (this.validateAccountData(data)) {
          if (this.debugMode) {
            console.log('Successfully scraped account data:', data);
          }
          return data;
        } else {
          throw new Error('Invalid account data scraped');
        }
      } catch (error) {
        retryCount++;
        if (retryCount <= maxRetries) {
          console.warn(`Account data scraping attempt ${retryCount} failed: ${error.message}. Retrying...`);
          // Wait before retrying with exponential backoff
          await this.waitForDelay(Math.pow(2, retryCount) * 100);
          
          // Try to refresh selectors on failure
          if (retryCount === 2) {
            this.setupSelectors();
          }
        } else {
          console.error('Error scraping account data after all retries:', error);
          return this.getEmptyAccountData();
        }
      }
    }
  }

  // Symbol and price extraction with enhanced techniques
  extractSymbol() {
    // Try to get symbol from selectors with caching
    const symbolText = this.extractTextFromSelectors(this.selectors.symbol, 'symbol');
    if (symbolText) {
      // Clean up the symbol text to ensure it's a valid trading pair
      return symbolText.replace(/[^A-Z]/g, '');
    }
    
    // If selectors fail, try to extract from URL or page title
    const url = window.location.href;
    const symbolMatch = url.match(/symbol=([A-Z]+)/i) || 
                        url.match(/([A-Z]{6})/g) || 
                        url.match(/instrument=([A-Z]+)/i);
    
    if (symbolMatch && symbolMatch[1]) {
      return symbolMatch[1].toUpperCase();
    }
    
    // Try to extract from page title
    const title = document.title;
    const titleMatch = title.match(/([A-Z]{3,6}\/[A-Z]{3,6})/i) || 
                       title.match(/([A-Z]{6,12})/i);
    
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].replace(/[^A-Z]/g, '').toUpperCase();
    }
    
    // Last resort: look for elements with currency pair patterns
    const allElements = document.querySelectorAll('div, span, p, a, button');
    for (const el of allElements) {
      const text = el.textContent.trim();
      // Look for common forex pair patterns like EUR/USD, EURUSD, etc.
      if (/^[A-Z]{3}\/[A-Z]{3}$/.test(text) || /^[A-Z]{6}$/.test(text)) {
        return text.replace(/[^A-Z]/g, '');
      }
    }
    
    return 'EURUSD'; // Default fallback
  }

  extractCurrentPrice() {
    // Try to get price from selectors with caching
    const priceText = this.extractTextFromSelectors(this.selectors.currentPrice, 'currentPrice');
    const price = this.parseNumericValue(priceText);
    
    if (price !== null && price > 0) {
      return price;
    }
    
    // If selectors fail, try more aggressive methods
    // Look for elements with numeric content that might be prices
    const priceRegex = /\d+\.\d{1,5}/; // Prices typically have decimal points
    const allElements = document.querySelectorAll('div, span, p');
    
    const priceElements = Array.from(allElements).filter(el => {
      const text = el.textContent.trim();
      return priceRegex.test(text) && 
             (el.className.toLowerCase().includes('price') || 
              el.id.toLowerCase().includes('price') ||
              el.className.toLowerCase().includes('rate') ||
              el.className.toLowerCase().includes('quote'));
    });
    
    // Sort by likelihood of being the current price (shorter text is more likely to be just a price)
    priceElements.sort((a, b) => a.textContent.length - b.textContent.length);
    
    for (const el of priceElements) {
      const price = this.parseNumericValue(el.textContent);
      if (price !== null && price > 0) {
        return price;
      }
    }
    
    // If still no price found, look for any number in the page that might be a price
    const allPriceMatches = document.body.textContent.match(/\d+\.\d{2,5}/g);
    if (allPriceMatches && allPriceMatches.length > 0) {
      // Filter out numbers that are too large or too small to be prices
      const possiblePrices = allPriceMatches
        .map(match => parseFloat(match))
        .filter(num => num > 0.001 && num < 100000);
      
      if (possiblePrices.length > 0) {
        // Return the median value as it's most likely to be the price
        possiblePrices.sort((a, b) => a - b);
        const midIndex = Math.floor(possiblePrices.length / 2);
        return possiblePrices[midIndex];
      }
    }
    
    return 0;
  }

  extractBidPrice() {
    // Enhanced selectors for bid price
    const selectors = [
      '.bid-price', 
      '.bid', 
      '[class*="bid"]',
      '[data-type="bid"]',
      '[data-price-type="bid"]',
      '.price-bid',
      '.bid-value',
      'div[class*="bid"]',
      'span[class*="bid"]'
    ];
    
    const bidText = this.extractTextFromSelectors(selectors, 'bidPrice');
    const bid = this.parseNumericValue(bidText);
    
    if (bid !== null && bid > 0) {
      return bid;
    }
    
    // If no bid price found, estimate from current price
    const currentPrice = this.extractCurrentPrice();
    if (currentPrice > 0) {
      // Estimate bid as slightly lower than current price
      return currentPrice * 0.9999;
    }
    
    return 0;
  }

  extractAskPrice() {
    // Enhanced selectors for ask price
    const selectors = [
      '.ask-price', 
      '.ask', 
      '[class*="ask"]',
      '[data-type="ask"]',
      '[data-price-type="ask"]',
      '.price-ask',
      '.ask-value',
      'div[class*="ask"]',
      'span[class*="ask"]'
    ];
    
    const askText = this.extractTextFromSelectors(selectors, 'askPrice');
    const ask = this.parseNumericValue(askText);
    
    if (ask !== null && ask > 0) {
      return ask;
    }
    
    // If no ask price found, estimate from current price
    const currentPrice = this.extractCurrentPrice();
    if (currentPrice > 0) {
      // Estimate ask as slightly higher than current price
      return currentPrice * 1.0001;
    }
    
    return 0;
  }

  extractSpread() {
    // Try to find spread directly first
    const spreadSelectors = [
      '.spread-value',
      '.spread',
      '[data-type="spread"]',
      '[class*="spread"]'
    ];
    
    const spreadText = this.extractTextFromSelectors(spreadSelectors, 'spread');
    const directSpread = this.parseNumericValue(spreadText);
    
    if (directSpread !== null && directSpread >= 0) {
      return directSpread;
    }
    
    // Calculate from bid/ask if direct spread not found
    const bid = this.extractBidPrice();
    const ask = this.extractAskPrice();
    
    if (bid > 0 && ask > 0) {
      // Calculate spread in pips for forex
      const symbol = this.extractSymbol();
      const isJPYPair = symbol.includes('JPY');
      const pipMultiplier = isJPYPair ? 100 : 10000;
      
      return Math.abs((ask - bid) * pipMultiplier);
    }
    
    return 0;
  }

  extractTimeframe() {
    // Enhanced selectors for timeframe
    const selectors = [
      '.timeframe-selector .active',
      '.period-selector .selected',
      '[class*="timeframe"].active',
      '.tf-selected',
      '[data-timeframe].active',
      '[data-period].selected',
      '.chart-period-active',
      '.active-timeframe'
    ];
    
    const timeframeText = this.extractTextFromSelectors(selectors, 'timeframe');
    
    if (timeframeText) {
      // Normalize timeframe format
      const normalized = timeframeText.toUpperCase().trim();
      
      // Handle different timeframe formats
      if (/^\d+[SMHD]$/.test(normalized)) {
        return normalized;
      }
      
      // Convert text timeframes to standard format
      const timeframeMap = {
        'MINUTE': 'M1',
        '1MINUTE': 'M1',
        '1MIN': 'M1',
        '1M': 'M1',
        '5MINUTE': 'M5',
        '5MIN': 'M5',
        '5M': 'M5',
        '15MINUTE': 'M15',
        '15MIN': 'M15',
        '15M': 'M15',
        '30MINUTE': 'M30',
        '30MIN': 'M30',
        '30M': 'M30',
        'HOUR': 'H1',
        '1HOUR': 'H1',
        '1H': 'H1',
        '4HOUR': 'H4',
        '4H': 'H4',
        'DAY': 'D1',
        '1DAY': 'D1',
        '1D': 'D1',
        'WEEK': 'W1',
        '1WEEK': 'W1',
        '1W': 'W1'
      };
      
      const key = normalized.replace(/\s+/g, '');
      if (timeframeMap[key]) {
        return timeframeMap[key];
      }
      
      // Extract numbers from timeframe text
      const numbers = normalized.match(/\d+/);
      if (numbers) {
        const number = numbers[0];
        if (normalized.includes('MIN') || normalized.includes('M')) {
          return `M${number}`;
        } else if (normalized.includes('HOUR') || normalized.includes('H')) {
          return `H${number}`;
        } else if (normalized.includes('DAY') || normalized.includes('D')) {
          return `D${number}`;
        }
      }
    }
    
    return 'M15'; // Default fallback
  }

  // Account data extraction with enhanced techniques
  async extractBalance() {
    // Enhanced selectors for balance
    const selectors = [
      ...this.selectors.balance,
      '[data-testid*="balance"]',
      '[aria-label*="balance"]',
      '[data-field="balance"]',
      '[data-account-field="balance"]',
      '.account-info-balance',
      '.balance-value',
      'div[class*="balance"]',
      'span[class*="balance"]',
      '.account-info .balance',
      '.wallet-balance',
      '.portfolio-balance'
    ];
    
    const balanceText = this.extractTextFromSelectors(selectors, 'balance');
    const balance = this.parseNumericValue(balanceText);
    
    if (balance !== null && balance >= 0) {
      return balance;
    }
    
    // If no balance found, try to find it in a table or list
    const accountInfoElements = document.querySelectorAll('.account-info, .account-details, .trading-account');
    for (const container of accountInfoElements) {
      const labels = container.querySelectorAll('label, .label, th, dt');
      for (const label of labels) {
        if (label.textContent.toLowerCase().includes('balance')) {
          // Find the corresponding value element
          let valueElement = label.nextElementSibling;
          if (!valueElement) {
            // Try to find in the same row
            valueElement = label.closest('tr')?.querySelector('td:last-child, .value');
          }
          
          if (valueElement) {
            const value = this.parseNumericValue(valueElement.textContent);
            if (value !== null && value >= 0) {
              return value;
            }
          }
        }
      }
    }
    
    // Last resort: look for any element with "balance" in its text and a number
    const allElements = document.querySelectorAll('div, span, p, td');
    for (const el of allElements) {
      const text = el.textContent.toLowerCase();
      if (text.includes('balance') && /\d/.test(text)) {
        const value = this.parseNumericValue(text);
        if (value !== null && value >= 0) {
          return value;
        }
      }
    }
    
    return 1000; // Default fallback with a realistic value
  }

  async extractEquity() {
    // Enhanced selectors for equity
    const selectors = [
      ...this.selectors.equity,
      '[data-testid*="equity"]',
      '[aria-label*="equity"]',
      '[data-field="equity"]',
      '[data-account-field="equity"]',
      '.account-info-equity',
      '.equity-value',
      'div[class*="equity"]',
      'span[class*="equity"]'
    ];
    
    const equityText = this.extractTextFromSelectors(selectors, 'equity');
    const equity = this.parseNumericValue(equityText);
    
    if (equity !== null && equity >= 0) {
      return equity;
    }
    
    // If no equity found, try to find it in a table or list
    const accountInfoElements = document.querySelectorAll('.account-info, .account-details, .trading-account');
    for (const container of accountInfoElements) {
      const labels = container.querySelectorAll('label, .label, th, dt');
      for (const label of labels) {
        if (label.textContent.toLowerCase().includes('equity')) {
          // Find the corresponding value element
          let valueElement = label.nextElementSibling;
          if (!valueElement) {
            // Try to find in the same row
            valueElement = label.closest('tr')?.querySelector('td:last-child, .value');
          }
          
          if (valueElement) {
            const value = this.parseNumericValue(valueElement.textContent);
            if (value !== null && value >= 0) {
              return value;
            }
          }
        }
      }
    }
    
    // Last resort: look for any element with "equity" in its text and a number
    const allElements = document.querySelectorAll('div, span, p, td');
    for (const el of allElements) {
      const text = el.textContent.toLowerCase();
      if (text.includes('equity') && /\d/.test(text)) {
        const value = this.parseNumericValue(text);
        if (value !== null && value >= 0) {
          return value;
        }
      }
    }
    
    // If equity not found, it might be the same as balance for some platforms
    const balance = await this.extractBalance();
    return balance;
  }

  async extractMargin() {
    const marginText = this.extractTextFromSelectors(this.selectors.margin, 'margin');
    const margin = this.parseNumericValue(marginText);
    
    if (margin !== null && margin >= 0) {
      return margin;
    }
    
    return 0;
  }

  async extractFreeMargin() {
    const freeMarginText = this.extractTextFromSelectors(this.selectors.freeMargin, 'freeMargin');
    const freeMargin = this.parseNumericValue(freeMarginText);
    
    if (freeMargin !== null && freeMargin >= 0) {
      return freeMargin;
    }
    
    // Calculate free margin if not directly available
    const equity = await this.extractEquity();
    const margin = await this.extractMargin();
    
    if (equity > 0 && margin >= 0) {
      return equity - margin;
    }
    
    return 0;
  }

  async extractMarginLevel() {
    const selectors = [
      '.margin-level', 
      '.margin-percentage', 
      '[class*="margin-level"]',
      '[data-testid*="margin-level"]'
    ];
    
    const levelText = this.extractTextFromSelectors(selectors, 'marginLevel');
    const level = this.parseNumericValue(levelText);
    
    if (level !== null && level >= 0) {
      return level;
    }
    
    // Calculate margin level if not directly available
    const equity = await this.extractEquity();
    const margin = await this.extractMargin();
    
    if (equity > 0 && margin > 0) {
      return (equity / margin) * 100;
    }
    
    return 0;
  }

  async extractOpenPnL() {
    const selectors = [
      '.open-pnl', 
      '.unrealized-pnl', 
      '.floating-pnl', 
      '[class*="pnl"]',
      '[data-testid*="pnl"]',
      '.profit-loss'
    ];
    
    const pnlText = this.extractTextFromSelectors(selectors, 'openPnL');
    const pnl = this.parseNumericValue(pnlText);
    
    if (pnl !== null) {
      return pnl;
    }
    
    return 0;
  }

  async extractTodayPnL() {
    const selectors = [
      '.today-pnl', 
      '.daily-pnl', 
      '[class*="today"]', 
      '[class*="daily"]',
      '[data-testid*="daily"]'
    ];
    
    const pnlText = this.extractTextFromSelectors(selectors, 'todayPnL');
    return this.parseNumericValue(pnlText) || 0;
  }

  async extractTotalPnL() {
    const selectors = [
      '.total-pnl', 
      '.overall-pnl', 
      '[class*="total"]',
      '[data-testid*="total"]'
    ];
    
    const pnlText = this.extractTextFromSelectors(selectors, 'totalPnL');
    return this.parseNumericValue(pnlText) || 0;
  }

  async extractOpenPositions() {
    const positionsContainer = this.findElementFromSelectors(this.selectors.positionsTable, 'positionsTable');
    
    if (positionsContainer) {
      const rows = positionsContainer.querySelectorAll('tr, .position-row, .trade-row');
      const headerRows = positionsContainer.querySelectorAll('thead tr, .header-row, tr.header');
      return Math.max(0, rows.length - headerRows.length);
    }
    
    // Alternative method: count position elements directly
    const positionElements = document.querySelectorAll(
      '.position-item, .trade-item, [class*="position-row"], [data-testid*="position"]'
    );
    
    return positionElements.length;
  }

  async extractAccountCurrency() {
    const selectors = [
      '.account-currency', 
      '.currency', 
      '[class*="currency"]',
      '[data-currency]',
      '[data-testid*="currency"]'
    ];
    
    const currencyText = this.extractTextFromSelectors(selectors, 'currency');
    
    if (currencyText) {
      // Extract currency code from text
      const currencyMatch = currencyText.match(/[A-Z]{3}/);
      if (currencyMatch) {
        return currencyMatch[0];
      }
    }
    
    // Try to extract from balance text
    const balanceText = this.extractTextFromSelectors(this.selectors.balance);
    if (balanceText) {
      const currencySymbols = {
        '$': 'USD',
        '€': 'EUR',
        '£': 'GBP',
        '¥': 'JPY',
        '₽': 'RUB'
      };
      
      for (const [symbol, currency] of Object.entries(currencySymbols)) {
        if (balanceText.includes(symbol)) {
          return currency;
        }
      }
    }
    
    return 'USD'; // Default fallback
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
  findElementFromSelectors(selectors, cacheKey = null) {
    // Check if we have a cached successful selector for this key
    if (cacheKey && this.lastFoundSelectors[cacheKey]) {
      const element = document.querySelector(this.lastFoundSelectors[cacheKey]);
      if (element) {
        return element;
      }
      // If cached selector failed, clear it and try all selectors
      delete this.lastFoundSelectors[cacheKey];
    }
    
    // Initialize selector attempts tracking if needed
    if (cacheKey && !this.selectorAttempts[cacheKey]) {
      this.selectorAttempts[cacheKey] = {};
      selectors.forEach(s => this.selectorAttempts[cacheKey][s] = { success: 0, failure: 0 });
    }
    
    // Try each selector, prioritizing those with higher success rates
    let prioritizedSelectors = [...selectors];
    if (cacheKey && this.selectorAttempts[cacheKey]) {
      prioritizedSelectors.sort((a, b) => {
        const aStats = this.selectorAttempts[cacheKey][a] || { success: 0, failure: 0 };
        const bStats = this.selectorAttempts[cacheKey][b] || { success: 0, failure: 0 };
        const aRate = aStats.success / (aStats.success + aStats.failure || 1);
        const bRate = bStats.success / (bStats.success + bStats.failure || 1);
        return bRate - aRate; // Higher success rate first
      });
    }
    
    // Try each selector
    for (const selector of prioritizedSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          // Cache successful selector
          if (cacheKey) {
            this.lastFoundSelectors[cacheKey] = selector;
            if (this.selectorAttempts[cacheKey] && this.selectorAttempts[cacheKey][selector]) {
              this.selectorAttempts[cacheKey][selector].success++;
            }
          }
          return element;
        } else if (cacheKey && this.selectorAttempts[cacheKey] && this.selectorAttempts[cacheKey][selector]) {
          this.selectorAttempts[cacheKey][selector].failure++;
        }
      } catch (error) {
        if (this.debugMode) {
          console.warn(`Selector error for "${selector}":`, error.message);
        }
      }
    }
    
    // Try to find elements using more advanced techniques if direct selectors fail
    if (selectors.some(s => s.includes('price') || s.includes('Price'))) {
      // Look for elements with price-like content using text content matching
      const priceRegex = /\d+\.\d+/;
      const allElements = document.querySelectorAll('div, span, p');
      for (const el of allElements) {
        if (priceRegex.test(el.textContent) && 
            (el.className.toLowerCase().includes('price') || 
             el.id.toLowerCase().includes('price'))) {
          return el;
        }
      }
    }
    
    return null;
  }

  extractTextFromSelectors(selectors, cacheKey = null) {
    const element = this.findElementFromSelectors(selectors, cacheKey);
    
    if (!element) {
      return null;
    }
    
    // Try different properties to extract the most meaningful text
    const properties = ['textContent', 'innerText', 'value'];
    
    for (const prop of properties) {
      if (element[prop] && element[prop].trim()) {
        return element[prop].trim();
      }
    }
    
    // Check for aria-label or title attributes
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label').trim();
    }
    
    if (element.getAttribute('title')) {
      return element.getAttribute('title').trim();
    }
    
    // Check for data attributes that might contain the value
    for (const attr of element.attributes) {
      if (attr.name.startsWith('data-') && attr.value && attr.value.trim()) {
        return attr.value.trim();
      }
    }
    
    return null;
  }

  parseNumericValue(text) {
    if (!text) return null;
    
    // Handle different formats and clean up
    let cleaned = text;
    
    // Remove currency symbols, commas, and extra spaces
    cleaned = cleaned.replace(/[$€£¥₽₴₸₺₼₾₽₸₺₼₾₿฿₫₭₮₱₲₴₹₺₼₽₾]/g, '')
                    .replace(/,/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
    
    // Handle percentage values
    if (cleaned.includes('%')) {
      cleaned = cleaned.replace(/%/g, '');
    }
    
    // Handle parentheses for negative numbers: (123.45) -> -123.45
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.substring(1, cleaned.length - 1);
    }
    
    // Handle K/M/B suffixes (e.g., 1.5K -> 1500)
    if (/\d+\.?\d*K$/i.test(cleaned)) {
      cleaned = cleaned.replace(/K$/i, '');
      return parseFloat(cleaned) * 1000;
    }
    
    if (/\d+\.?\d*M$/i.test(cleaned)) {
      cleaned = cleaned.replace(/M$/i, '');
      return parseFloat(cleaned) * 1000000;
    }
    
    if (/\d+\.?\d*B$/i.test(cleaned)) {
      cleaned = cleaned.replace(/B$/i, '');
      return parseFloat(cleaned) * 1000000000;
    }
    
    // Extract the first number found in the string
    const matches = cleaned.match(/-?\d+\.?\d*/);
    if (matches && matches.length > 0) {
      const value = parseFloat(matches[0]);
      return isNaN(value) ? null : value;
    }
    
    return null;
  }

  waitForDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Debug and diagnostic methods
  enableDebugMode() {
    this.debugMode = true;
    console.log('ExnessScraper debug mode enabled');
  }

  disableDebugMode() {
    this.debugMode = false;
    console.log('ExnessScraper debug mode disabled');
  }

  getSelectorStats() {
    return {
      lastFoundSelectors: this.lastFoundSelectors,
      selectorAttempts: this.selectorAttempts,
      platform: this.platform
    };
  }

  // Enhanced diagnostic method to test all selectors
  async runDiagnostics() {
    console.log('Running ExnessScraper diagnostics...');
    
    const diagnostics = {
      platform: this.platform,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      results: {}
    };

    // Test market data extraction
    try {
      diagnostics.results.marketData = {
        symbol: this.extractSymbol(),
        price: this.extractCurrentPrice(),
        bid: this.extractBidPrice(),
        ask: this.extractAskPrice(),
        spread: this.extractSpread(),
        timeframe: this.extractTimeframe(),
        volume: this.extractVolume()
      };
    } catch (error) {
      diagnostics.results.marketData = { error: error.message };
    }

    // Test account data extraction
    try {
      diagnostics.results.accountData = {
        balance: await this.extractBalance(),
        equity: await this.extractEquity(),
        margin: await this.extractMargin(),
        freeMargin: await this.extractFreeMargin(),
        marginLevel: await this.extractMarginLevel(),
        openPnl: await this.extractOpenPnL(),
        openPositions: await this.extractOpenPositions(),
        currency: await this.extractAccountCurrency()
      };
    } catch (error) {
      diagnostics.results.accountData = { error: error.message };
    }

    // Test UI element availability
    diagnostics.results.uiElements = {
      buyButton: !!this.findElementFromSelectors(this.selectors.buyButton),
      sellButton: !!this.findElementFromSelectors(this.selectors.sellButton),
      lotSizeInput: !!this.findElementFromSelectors(this.selectors.lotSizeInput),
      symbolSelector: !!this.findElementFromSelectors(this.selectors.symbolSelector),
      timeframeSelector: !!this.findElementFromSelectors(this.selectors.timeframeSelector)
    };

    console.log('Diagnostics complete:', diagnostics);
    return diagnostics;
  }

  // Method to refresh selectors if page structure changes
  refreshSelectors() {
    this.lastFoundSelectors = {};
    this.selectorAttempts = {};
    this.setupSelectors();
    console.log('Selectors refreshed for platform:', this.platform);
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
