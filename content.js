class ChaosTraderXContent {
  constructor() {
    this.isInjected = false;
    this.isTrading = false;
    this.config = {};
    this.scrapeInterval = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    
    this.init();
  }

  async init() {
    console.log('ChaosTraderX Content Script initialized on:', window.location.href);
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  async setup() {
    try {
      // Inject the main scraping script
      await this.injectScript('injected.js');
      
      // Setup message handlers
      this.setupMessageHandlers();
      
      // Setup mutation observer for dynamic content
      this.setupMutationObserver();
      
      // Start monitoring page changes
      this.startPageMonitoring();
      
      // Notify background that content script is ready
      chrome.runtime.sendMessage({
        action: 'CONTENT_SCRIPT_READY',
        url: window.location.href
      });
      
    } catch (error) {
      console.error('Content script setup error:', error);
      this.retrySetup();
    }
  }

  async retrySetup() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      console.log(`Retrying content script setup (${this.retryCount}/${this.maxRetries})`);
      setTimeout(() => this.setup(), 2000);
    } else {
      console.error('Content script setup failed after maximum retries');
    }
  }

  async injectScript(scriptName) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(scriptName);
      script.type = 'module';
      
      script.onload = () => {
        console.log(`${scriptName} injected successfully`);
        this.isInjected = true;
        resolve();
      };
      
      script.onerror = (error) => {
        console.error(`Failed to inject ${scriptName}:`, error);
        reject(error);
      };
      
      (document.head || document.documentElement).appendChild(script);
    });
  }

  setupMessageHandlers() {
    // Handle messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleBackgroundMessage(request, sender, sendResponse);
      return true; // Keep message channel open
    });

    // Handle messages from injected scripts
    window.addEventListener('message', (event) => {
      if (event.source !== window || !event.data.type) return;
      
      if (event.data.type === 'EXNESS_DATA_UPDATE') {
        this.handleExnessDataUpdate(event.data);
      } else if (event.data.type === 'TRADE_RESULT') {
        this.handleTradeResult(event.data);
      }
    });
  }

  async handleBackgroundMessage(request, sender, sendResponse) {
    const { action, data } = request;
    
    try {
      switch (action) {
        case 'START_TRADING':
          this.isTrading = true;
          this.config = data || {};
          await this.startTrading();
          sendResponse({ success: true });
          break;
          
        case 'STOP_TRADING':
          this.isTrading = false;
          await this.stopTrading();
          sendResponse({ success: true });
          break;
          
        case 'EMERGENCY_CLOSE_ALL':
          await this.emergencyCloseAll();
          sendResponse({ success: true });
          break;
          
        case 'EXECUTE_TRADE':
          const result = await this.executeTrade(data);
          sendResponse(result);
          break;
          
        case 'SWITCH_SYMBOL':
          await this.switchSymbol(data);
          sendResponse({ success: true });
          break;
          
        case 'SWITCH_TIMEFRAME':
          await this.switchTimeframe(data);
          sendResponse({ success: true });
          break;
          
        case 'GET_ACCOUNT_DATA':
          const accountData = await this.getAccountData();
          sendResponse({ success: true, data: accountData });
          break;
          
        case 'CONFIG_UPDATED':
          this.config = data;
          this.notifyInjectedScript('CONFIG_UPDATE', data);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Content script message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startTrading() {
    if (!this.isInjected) {
      throw new Error('Scripts not injected');
    }
    
    // Start data scraping
    this.startDataScraping();
    
    // Notify injected script to start trading mode
    this.notifyInjectedScript('START_TRADING', this.config);
    
    console.log('Trading started on content script');
  }

  async stopTrading() {
    // Stop data scraping
    this.stopDataScraping();
    
    // Notify injected script to stop trading
    this.notifyInjectedScript('STOP_TRADING');
    
    console.log('Trading stopped on content script');
  }

  async emergencyCloseAll() {
    this.notifyInjectedScript('EMERGENCY_CLOSE_ALL');
    console.log('Emergency close all positions triggered');
  }

  async executeTrade(signal) {
    try {
      if (!this.isInjected) {
        throw new Error('Scripts not injected');
      }
      
      console.log('Executing trade:', signal);
      
      // Send trade signal to injected script
      this.notifyInjectedScript('EXECUTE_TRADE', signal);
      
      // Wait for trade result (with timeout)
      const result = await this.waitForTradeResult(signal.id || Date.now(), 10000);
      
      return { success: true, result };
      
    } catch (error) {
      console.error('Trade execution error:', error);
      return { success: false, error: error.message };
    }
  }

  async switchSymbol(symbol) {
    this.notifyInjectedScript('SWITCH_SYMBOL', symbol);
    
    // Wait for symbol switch to complete
    await this.waitForDelay(1000);
    
    console.log(`Switched to symbol: ${symbol}`);
  }

  async switchTimeframe(timeframe) {
    this.notifyInjectedScript('SWITCH_TIMEFRAME', timeframe);
    
    // Wait for timeframe switch to complete
    await this.waitForDelay(1000);
    
    console.log(`Switched to timeframe: ${timeframe}`);
  }

  startDataScraping() {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
    }
    
    // Scrape data every 2 seconds
    this.scrapeInterval = setInterval(() => {
      this.scrapeAndSendData();
    }, 2000);
    
    // Initial scrape
    this.scrapeAndSendData();
  }

  stopDataScraping() {
    if (this.scrapeInterval) {
      clearInterval(this.scrapeInterval);
      this.scrapeInterval = null;
    }
  }

  async scrapeAndSendData() {
    try {
      // Request data from injected script
      this.notifyInjectedScript('REQUEST_DATA');
    } catch (error) {
      console.error('Data scraping error:', error);
    }
  }

  async getAccountData() {
    return new Promise((resolve) => {
      this.notifyInjectedScript('GET_ACCOUNT_DATA');
      
      // Set up one-time listener for account data response
      const handler = (event) => {
        if (event.data.type === 'ACCOUNT_DATA_RESPONSE') {
          window.removeEventListener('message', handler);
          resolve(event.data.data);
        }
      };
      
      window.addEventListener('message', handler);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve({});
      }, 5000);
    });
  }

  handleExnessDataUpdate(data) {
    // Forward data to background script
    chrome.runtime.sendMessage({
      action: 'MARKET_DATA_UPDATE',
      data: data.payload
    });
  }

  handleTradeResult(data) {
    // Store trade result for waitForTradeResult
    this.lastTradeResult = data.payload;
    
    // Forward to background script
    chrome.runtime.sendMessage({
      action: 'TRADE_EXECUTED',
      data: data.payload
    });
  }

  async waitForTradeResult(tradeId, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkResult = () => {
        if (this.lastTradeResult) {
          const result = this.lastTradeResult;
          this.lastTradeResult = null;
          resolve(result);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Trade execution timeout'));
        } else {
          setTimeout(checkResult, 100);
        }
      };
      
      checkResult();
    });
  }

  notifyInjectedScript(action, data = null) {
    window.postMessage({
      type: 'CONTENT_SCRIPT_MESSAGE',
      action,
      data
    }, '*');
  }

  setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldRescrape = false;
      
      mutations.forEach((mutation) => {
        // Check if trading interface changed
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          shouldRescrape = true;
        }
      });
      
      if (shouldRescrape && this.isTrading) {
        this.scrapeAndSendData();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  startPageMonitoring() {
    // Monitor for page navigation
    let currentUrl = window.location.href;
    
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('Page navigation detected:', currentUrl);
        
        // Re-initialize if needed
        if (!this.isInjected) {
          this.setup();
        }
      }
    }, 1000);
  }

  waitForDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize content script
new ChaosTraderXContent();
