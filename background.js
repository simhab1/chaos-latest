import { AlBrooksAnalysis } from './albrooks-analysis.js';
import { VolumeAnalysis } from './volume-analysis.js';
import { SentimentAnalysis } from './sentiment-analysis.js';
import { TradingEngine } from './trading-engine.js';

class ChaosTraderXBackground {
  constructor() {
    this.isActive = false;
    this.config = {
      autoTrading: false,
      confidenceThreshold: 98,
      maxLotSize: 0.01,
      sentimentFilter: true,
      volumeValidation: true,
      symbol: 'BTCUSD',
      timeframe: 'M15'
    };
    
    this.albrooksAnalyzer = new AlBrooksAnalysis();
    this.volumeAnalyzer = new VolumeAnalysis();
    this.sentimentAnalyzer = new SentimentAnalysis();
    this.tradingEngine = new TradingEngine();
    
    this.marketData = {};
    this.accountData = {};
    this.analysisData = {};
    this.trades = [];
    this.logs = [];
    
    this.init();
  }

  init() {
    this.setupMessageHandlers();
    this.loadStoredConfig();
    this.startAnalysisLoop();
    
    console.log('ChaosTraderX Background Service Worker initialized');
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle tab updates to inject scripts
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('exness.com')) {
        this.injectAdvancedScripts(tabId);
      }
    });
  }

  async handleMessage(request, sender, sendResponse) {
    const { action, data } = request;
    
    try {
      switch (action) {
        case 'START_TRADING':
          await this.startTrading(data);
          sendResponse({ success: true, message: 'Trading started' });
          break;
          
        case 'STOP_TRADING':
          await this.stopTrading();
          sendResponse({ success: true, message: 'Trading stopped' });
          break;
          
        case 'EMERGENCY_STOP':
          await this.emergencyStop();
          sendResponse({ success: true, message: 'Emergency stop executed' });
          break;
          
        case 'UPDATE_CONFIG':
          await this.updateConfig(data);
          sendResponse({ success: true, message: 'Configuration updated' });
          break;
          
        case 'GET_STATUS':
          sendResponse(this.getStatus());
          break;
          
        case 'GET_ANALYSIS':
          sendResponse(this.analysisData);
          break;
          
        case 'SWITCH_SYMBOL':
          await this.switchSymbol(data.symbol);
          sendResponse({ success: true, message: `Switched to ${data.symbol}` });
          break;
          
        case 'SWITCH_TIMEFRAME':
          await this.switchTimeframe(data.timeframe);
          sendResponse({ success: true, message: `Switched to ${data.timeframe}` });
          break;
          
        case 'MARKET_DATA_UPDATE':
          this.handleMarketDataUpdate(data);
          sendResponse({ success: true });
          break;
          
        case 'ACCOUNT_DATA_UPDATE':
          this.handleAccountDataUpdate(data);
          sendResponse({ success: true });
          break;
          
        case 'TRADE_EXECUTED':
          this.handleTradeExecuted(data);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async loadStoredConfig() {
    try {
      const stored = await chrome.storage.local.get(['config']);
      if (stored.config) {
        this.config = { ...this.config, ...stored.config };
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  async updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    await chrome.storage.local.set({ config: this.config });
    
    // Notify content script of config changes
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          // Check if tab is ready and has content script loaded
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'CONFIG_UPDATED',
              config: this.config
            });
          }
        } catch (error) {
          // Content script might not be loaded yet - this is normal
          console.warn('Content script not ready on tab:', tab.id);
        }
      }
    } catch (error) {
      console.warn('No Exness tabs found for config update');
    }
  }

  async startTrading(config) {
    if (config) {
      await this.updateConfig(config);
    }
    
    this.isActive = true;
    this.addLog('Trading started with Al Brooks analysis', 'success');
    
    // Initialize trading engine
    await this.tradingEngine.initialize(this.config);
    
    // Notify content scripts
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          // Check if tab is ready and has content script loaded
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'START_TRADING',
              config: this.config
            });
          }
        } catch (error) {
          // Content script might not be loaded yet - this is normal
          console.warn('Content script not ready on tab:', tab.id);
        }
      }
    } catch (error) {
      console.warn('No Exness tabs found for trading start');
    }
  }

  async stopTrading() {
    this.isActive = false;
    this.addLog('Trading stopped', 'info');
    
    // Stop trading engine
    await this.tradingEngine.stop();
    
    // Notify content scripts
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'STOP_TRADING'
            });
          }
        } catch (error) {
          console.warn('Content script not ready on tab:', tab.id);
        }
      }
    } catch (error) {
      console.warn('No Exness tabs found for trading stop');
    }
  }

  async emergencyStop() {
    this.isActive = false;
    this.addLog('EMERGENCY STOP ACTIVATED', 'error');
    
    // Emergency stop trading engine
    await this.tradingEngine.emergencyStop();
    
    // Close all positions if possible
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'EMERGENCY_CLOSE_ALL'
            });
          }
        } catch (error) {
          console.warn('Content script not ready for emergency stop on tab:', tab.id);
        }
      }
    } catch (error) {
      console.warn('No Exness tabs found for emergency stop');
    }
  }

  async switchSymbol(symbol) {
    this.config.symbol = symbol;
    await this.updateConfig({ symbol });
    
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'SWITCH_SYMBOL',
              symbol
            });
          }
        } catch (error) {
          console.warn('Content script not ready for symbol switch on tab:', tab.id);
        }
      }
    } catch (error) {
      console.warn('No Exness tabs found for symbol switch');
    }
  }

  async switchTimeframe(timeframe) {
    this.config.timeframe = timeframe;
    await this.updateConfig({ timeframe });
    
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'SWITCH_TIMEFRAME',
              timeframe
            });
          }
        } catch (error) {
          console.warn('Content script not ready for timeframe switch on tab:', tab.id);
        }
      }
    } catch (error) {
      console.warn('No Exness tabs found for timeframe switch');
    }
  }

  async injectAdvancedScripts(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['injected-advanced.js']
      });
      
      console.log('Advanced scripts injected into tab:', tabId);
    } catch (error) {
      console.error('Error injecting advanced scripts:', error);
    }
  }

  startAnalysisLoop() {
    // Run analysis every 2 seconds
    setInterval(() => {
      if (this.isActive && this.marketData.candles) {
        this.performAnalysis();
      }
    }, 2000);
  }

  async performAnalysis() {
    try {
      const { symbol, timeframe } = this.config;
      const candles = this.marketData.candles;
      
      if (!candles || candles.length < 20) {
        return;
      }

      // Perform Al Brooks analysis
      const albrooksAnalysis = await this.albrooksAnalyzer.analyze(candles, timeframe);
      
      // Perform volume analysis
      const volumeAnalysis = this.volumeAnalyzer.analyzeVolumeData(candles, timeframe);
      
      // Perform sentiment analysis (filter only)
      const sentimentAnalysis = await this.sentimentAnalyzer.analyzeSentiment(symbol, timeframe);
      
      // Combine analysis
      this.analysisData = {
        albrooks: albrooksAnalysis,
        volume: volumeAnalysis,
        sentiment: sentimentAnalysis,
        timestamp: Date.now()
      };

      // Check for trading opportunities
      if (this.config.autoTrading) {
        await this.evaluateTradingOpportunity();
      }

      // Notify popup of analysis update
      this.notifyPopup('ANALYSIS_UPDATE', this.analysisData);
      
    } catch (error) {
      console.error('Analysis error:', error);
      this.addLog(`Analysis error: ${error.message}`, 'error');
    }
  }

  async evaluateTradingOpportunity() {
    try {
      const signal = await this.tradingEngine.evaluateSignal(
        this.analysisData,
        this.config,
        this.accountData
      );

      if (signal && signal.action && signal.confidence >= this.config.confidenceThreshold) {
        // Apply sentiment filter
        if (this.config.sentimentFilter && this.analysisData.sentiment.recommendation === 'FILTER_OUT') {
          this.addLog(`Trade filtered out by sentiment: ${this.analysisData.sentiment.reason}`, 'warning');
          return;
        }

        // Apply volume validation
        if (this.config.volumeValidation && !this.analysisData.volume.hasVolumeSpike) {
          this.addLog('Trade filtered out: insufficient volume confirmation', 'warning');
          return;
        }

        // Execute trade
        await this.executeTrade(signal);
      }
    } catch (error) {
      console.error('Trading evaluation error:', error);
      this.addLog(`Trading evaluation error: ${error.message}`, 'error');
    }
  }

  async executeTrade(signal) {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      if (tabs.length === 0) {
        throw new Error('No Exness tabs found');
      }

      const activeTab = tabs.find(tab => tab.status === 'complete');
      if (!activeTab) {
        throw new Error('No active Exness tabs found');
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'EXECUTE_TRADE',
        signal
      });

      if (response && response.success) {
        this.trades.push({
          id: Date.now(),
          signal,
          timestamp: new Date(),
          status: 'executed'
        });

        this.addLog(`Trade executed: ${signal.action} ${signal.symbol} ${signal.lotSize} lots`, 'success');
        this.notifyPopup('TRADE_EXECUTED', { signal });
      } else {
        throw new Error(response?.error || 'Trade execution failed');
      }
    } catch (error) {
      console.error('Trade execution error:', error);
      this.addLog(`Trade execution failed: ${error.message}`, 'error');
    }
  }

  handleMarketDataUpdate(data) {
    this.marketData = { ...this.marketData, ...data };
  }

  handleAccountDataUpdate(data) {
    this.accountData = { ...this.accountData, ...data };
  }

  handleTradeExecuted(data) {
    this.trades.push({
      id: Date.now(),
      ...data,
      timestamp: new Date()
    });
    
    this.addLog(`Trade executed: ${data.action} ${data.symbol}`, 'success');
  }

  getStatus() {
    return {
      isActive: this.isActive,
      symbol: this.config.symbol,
      timeframe: this.config.timeframe,
      totalTrades: this.trades.length,
      lastUpdate: Date.now(),
      accountData: this.accountData
    };
  }

  addLog(message, type = 'info') {
    const log = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    this.logs.unshift(log);
    
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    
    console.log(`[ChaosTraderX] ${type.toUpperCase()}: ${message}`);
  }

  async notifyPopup(action, data) {
    try {
      await chrome.runtime.sendMessage({ action, data });
    } catch (error) {
      // Popup might not be open
    }
  }
}

// Initialize the background service
new ChaosTraderXBackground();
