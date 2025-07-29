import { AlBrooksAnalysis } from './albrooks-analysis.js';
import { VolumeAnalysis } from './volume-analysis.js';
import { SentimentAnalysis } from './sentiment-analysis.js';
import { TradingEngine } from './trading-engine.js';

class ChaosTraderXBackground {
  constructor() {
    this.isActive = false;
    this.startTime = Date.now();
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
    this.pendingTrades = [];
    
    // Initialize intervals
    this.healthCheckInterval = null;
    this.dataFlowInterval = null;
    this.analysisInterval = null;
    
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
          const startResult = await this.startTradingRobust(data);
          sendResponse({ success: startResult.success, message: startResult.message, data: startResult.data });
          break;
          
        case 'STOP_TRADING':
          const stopResult = await this.stopTradingRobust();
          sendResponse({ success: stopResult.success, message: stopResult.message });
          break;
          
        case 'EMERGENCY_STOP':
          const emergencyResult = await this.emergencyStopRobust();
          sendResponse({ success: emergencyResult.success, message: emergencyResult.message });
          break;
          
        case 'UPDATE_CONFIG':
          const configResult = await this.updateConfigRobust(data);
          sendResponse({ success: configResult.success, message: configResult.message });
          break;
          
        case 'GET_STATUS':
          const status = await this.getStatusRobust();
          sendResponse(status);
          break;
          
        case 'GET_ANALYSIS':
          const analysis = await this.getAnalysisRobust();
          sendResponse(analysis);
          break;
          
        case 'SWITCH_SYMBOL':
          const symbolResult = await this.switchSymbolRobust(data.symbol);
          sendResponse({ success: symbolResult.success, message: symbolResult.message });
          break;
          
        case 'SWITCH_TIMEFRAME':
          const timeframeResult = await this.switchTimeframeRobust(data.timeframe);
          sendResponse({ success: timeframeResult.success, message: timeframeResult.message });
          break;
          
        case 'MARKET_DATA_UPDATE':
          await this.handleMarketDataUpdateRobust(data);
          sendResponse({ success: true });
          break;
          
        case 'ACCOUNT_DATA_UPDATE':
          await this.handleAccountDataUpdateRobust(data);
          sendResponse({ success: true });
          break;
          
        case 'HEALTH_CHECK':
          const healthStatus = await this.performHealthCheck();
          sendResponse(healthStatus);
          break;
          
        case 'RESET_SYSTEM':
          const resetResult = await this.resetSystemRobust();
          sendResponse({ success: resetResult.success, message: resetResult.message });
          break;
          
        default:
          sendResponse({ success: false, message: `Unknown action: ${action}` });
      }
    } catch (error) {
      console.error(`Error handling message ${action}:`, error);
      const errorResponse = {
        success: false,
        message: `System error: ${error.message}`,
        error: error.stack,
        action,
        timestamp: Date.now(),
        recovery: this.getRecoveryAction(action, error)
      };
      sendResponse(errorResponse);
      
      // Log error for monitoring
      this.logError(action, error, data);
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

  async startTradingRobust(data) {
    try {
      // Validate configuration
      const validation = await this.validateConfiguration(data);
      if (!validation.isValid) {
        return { success: false, message: `Configuration validation failed: ${validation.errors.join(', ')}` };
      }

      // Update configuration
      this.config = { ...this.config, ...data };
      
      // Initialize analysis engines with error handling
      const initResults = await this.initializeAnalysisEngines();
      if (!initResults.success) {
        return { success: false, message: `Engine initialization failed: ${initResults.message}` };
      }

      // Start trading with recovery
      this.isActive = true;
      
      // Store state
      await this.saveState();
      
      // Start monitoring
      this.startSystemMonitoring();
      
      console.log('Trading started successfully with enhanced error handling');
      return { 
        success: true, 
        message: 'Trading started successfully',
        data: {
          config: this.config,
          engines: initResults.engines,
          timestamp: Date.now()
        }
      };
      
    } catch (error) {
      console.error('Failed to start trading:', error);
      await this.performRecovery('START_TRADING', error);
      return { success: false, message: `Failed to start trading: ${error.message}` };
    }
  }

  async stopTradingRobust() {
    try {
      this.isActive = false;
      
      // Close any open positions with confirmation
      await this.closeAllPositionsGracefully();
      
      // Stop all intervals and timers
      this.stopAllIntervals();
      
      // Save final state
      await this.saveState();
      
      console.log('Trading stopped successfully');
      return { success: true, message: 'Trading stopped successfully' };
      
    } catch (error) {
      console.error('Error stopping trading:', error);
      // Force stop even if there are errors
      this.isActive = false;
      return { success: false, message: `Trading stopped with errors: ${error.message}` };
    }
  }

  async emergencyStopRobust() {
    try {
      console.log('EMERGENCY STOP ACTIVATED');
      
      // Immediate stop
      this.isActive = false;
      
      // Try to close positions immediately
      await Promise.race([
        this.closeAllPositionsEmergency(),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]);
      
      // Stop all systems
      this.stopAllIntervals();
      
      // Clear any pending trades
      this.clearPendingTrades();
      
      // Log emergency stop
      await this.logEmergencyStop();
      
      return { success: true, message: 'Emergency stop executed successfully' };
      
    } catch (error) {
      console.error('Emergency stop error:', error);
      // Even if there's an error, ensure trading is stopped
      this.isActive = false;
      return { success: false, message: `Emergency stop completed with errors: ${error.message}` };
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

  // Add missing robust methods
  async updateConfigRobust(data) {
    try {
      // Validate configuration first
      const validation = await this.validateConfiguration(data);
      if (!validation.isValid) {
        return { success: false, message: `Configuration validation failed: ${validation.errors.join(', ')}` };
      }

      await this.updateConfig(data);
      return { success: true, message: 'Configuration updated successfully' };
    } catch (error) {
      console.error('Error updating config:', error);
      return { success: false, message: `Failed to update configuration: ${error.message}` };
    }
  }

  async getStatusRobust() {
    try {
      const status = this.getStatus();
      return { success: true, data: status };
    } catch (error) {
      console.error('Error getting status:', error);
      return { success: false, message: `Failed to get status: ${error.message}` };
    }
  }

  async getAnalysisRobust() {
    try {
      return { 
        success: true, 
        data: {
          analysisData: this.analysisData,
          marketData: this.marketData,
          trades: this.trades,
          logs: this.logs
        }
      };
    } catch (error) {
      console.error('Error getting analysis:', error);
      return { success: false, message: `Failed to get analysis: ${error.message}` };
    }
  }

  async switchSymbolRobust(symbol) {
    try {
      await this.switchSymbol(symbol);
      return { success: true, message: `Symbol switched to ${symbol}` };
    } catch (error) {
      console.error('Error switching symbol:', error);
      return { success: false, message: `Failed to switch symbol: ${error.message}` };
    }
  }

  async switchTimeframeRobust(timeframe) {
    try {
      await this.switchTimeframe(timeframe);
      return { success: true, message: `Timeframe switched to ${timeframe}` };
    } catch (error) {
      console.error('Error switching timeframe:', error);
      return { success: false, message: `Failed to switch timeframe: ${error.message}` };
    }
  }

  async handleMarketDataUpdateRobust(data) {
    try {
      this.handleMarketDataUpdate(data);
      return { success: true };
    } catch (error) {
      console.error('Error handling market data update:', error);
      return { success: false, message: `Failed to handle market data update: ${error.message}` };
    }
  }

  async handleAccountDataUpdateRobust(data) {
    try {
      this.handleAccountDataUpdate(data);
      return { success: true };
    } catch (error) {
      console.error('Error handling account data update:', error);
      return { success: false, message: `Failed to handle account data update: ${error.message}` };
    }
  }

  async resetSystemRobust() {
    try {
      // Stop trading first
      this.isActive = false;
      
      // Clear all intervals
      this.stopAllIntervals();
      
      // Reset data
      this.marketData = {};
      this.accountData = {};
      this.analysisData = {};
      this.trades = [];
      this.logs = [];
      
      // Clear storage
      await chrome.storage.local.clear();
      
      // Reinitialize
      await this.loadStoredConfig();
      this.startAnalysisLoop();
      
      return { success: true, message: 'System reset successfully' };
    } catch (error) {
      console.error('Error resetting system:', error);
      return { success: false, message: `Failed to reset system: ${error.message}` };
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
    // Clear existing interval if any
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    // Run analysis every 2 seconds
    this.analysisInterval = setInterval(() => {
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

  async validateConfiguration(config) {
    const errors = [];
    
    // Validate confidence threshold
    if (config.confidenceThreshold < 50 || config.confidenceThreshold > 99) {
      errors.push('Confidence threshold must be between 50-99%');
    }
    
    // Validate lot size
    if (config.maxLotSize <= 0 || config.maxLotSize > 10) {
      errors.push('Max lot size must be between 0.01 and 10');
    }
    
    // Validate symbol
    const validSymbols = ['BTCUSD', 'EURUSD', 'GBPUSD', 'XAUUSD', 'USDJPY', 'AUDUSD'];
    if (config.symbol && !validSymbols.includes(config.symbol)) {
      errors.push(`Invalid symbol. Must be one of: ${validSymbols.join(', ')}`);
    }
    
    // Validate timeframe
    const validTimeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];
    if (config.timeframe && !validTimeframes.includes(config.timeframe)) {
      errors.push(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async initializeAnalysisEngines() {
    const engines = {};
    const results = [];
    
    try {
      // Initialize Al Brooks Analysis
      await this.albrooksAnalyzer.initialize?.(this.config);
      engines.albrooks = 'initialized';
      results.push('Al Brooks Analysis: OK');
    } catch (error) {
      engines.albrooks = 'failed';
      results.push(`Al Brooks Analysis: FAILED - ${error.message}`);
    }
    
    try {
      // Initialize Volume Analysis
      await this.volumeAnalyzer.initialize?.(this.config);
      engines.volume = 'initialized';
      results.push('Volume Analysis: OK');
    } catch (error) {
      engines.volume = 'failed';
      results.push(`Volume Analysis: FAILED - ${error.message}`);
    }
    
    try {
      // Initialize Sentiment Analysis
      await this.sentimentAnalyzer.initialize?.(this.config);
      engines.sentiment = 'initialized';
      results.push('Sentiment Analysis: OK');
    } catch (error) {
      engines.sentiment = 'failed';
      results.push(`Sentiment Analysis: FAILED - ${error.message}`);
    }
    
    try {
      // Initialize Trading Engine
      await this.tradingEngine.initialize(this.config);
      engines.trading = 'initialized';
      results.push('Trading Engine: OK');
    } catch (error) {
      engines.trading = 'failed';
      results.push(`Trading Engine: FAILED - ${error.message}`);
      return { success: false, message: 'Critical: Trading Engine failed to initialize', engines };
    }
    
    return { 
      success: true, 
      message: results.join(', '), 
      engines 
    };
  }

  async performHealthCheck() {
    const health = {
      timestamp: Date.now(),
      status: 'healthy',
      components: {},
      issues: [],
      performance: {}
    };
    
    try {
      // Check system status
      health.components.system = {
        active: this.isActive,
        uptime: Date.now() - this.startTime,
        memoryUsage: this.getMemoryUsage()
      };
      
      // Check analysis engines
      health.components.engines = await this.checkEngineHealth();
      
      // Check data flow
      health.components.dataFlow = await this.checkDataFlow();
      
      // Check trading status
      health.components.trading = await this.checkTradingHealth();
      
      // Determine overall health
      const hasIssues = Object.values(health.components).some(comp => 
        comp.status && comp.status !== 'healthy'
      );
      
      if (hasIssues) {
        health.status = 'degraded';
        health.issues = this.collectHealthIssues(health.components);
      }
      
    } catch (error) {
      health.status = 'unhealthy';
      health.issues.push(`Health check failed: ${error.message}`);
    }
    
    return health;
  }

  async performRecovery(action, error) {
    console.log(`Performing recovery for action: ${action}`);
    
    try {
      switch (action) {
        case 'START_TRADING':
          await this.recoverStartTrading(error);
          break;
        case 'ANALYSIS_ERROR':
          await this.recoverAnalysisError(error);
          break;
        case 'DATA_EXTRACTION_ERROR':
          await this.recoverDataExtractionError(error);
          break;
        case 'TRADE_EXECUTION_ERROR':
          await this.recoverTradeExecutionError(error);
          break;
        default:
          await this.performGeneralRecovery(error);
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
    }
  }

  getRecoveryAction(action, error) {
    const errorType = error.message.toLowerCase();
    
    if (errorType.includes('network') || errorType.includes('fetch')) {
      return 'Check internet connection and retry in 30 seconds';
    } else if (errorType.includes('dom') || errorType.includes('selector')) {
      return 'Page may have changed - try refreshing the Exness platform';
    } else if (errorType.includes('config') || errorType.includes('validation')) {
      return 'Check and correct configuration settings';
    } else if (errorType.includes('trading') || errorType.includes('execution')) {
      return 'Verify trading account status and permissions';
    } else {
      return 'Contact support with error details';
    }
  }

  startSystemMonitoring() {
    // Monitor system health every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.performHealthCheck();
      
      if (health.status !== 'healthy') {
        console.warn('System health degraded:', health.issues);
        await this.handleHealthIssues(health);
      }
    }, 30000);
    
    // Monitor data flow every 10 seconds
    this.dataFlowInterval = setInterval(() => {
      this.checkDataFlowStatus();
    }, 10000);
  }

  async handleHealthIssues(health) {
    for (const issue of health.issues) {
      console.log(`Addressing health issue: ${issue}`);
      
      if (issue.includes('data flow')) {
        await this.recoverDataFlow();
      } else if (issue.includes('engine')) {
        await this.restartFailedEngines();
      } else if (issue.includes('memory')) {
        await this.cleanupMemory();
      }
    }
  }

  async saveState() {
    try {
      const state = {
        isActive: this.isActive,
        config: this.config,
        lastUpdate: Date.now(),
        trades: this.trades.slice(-50), // Keep last 50 trades
        logs: this.logs.slice(-100) // Keep last 100 logs
      };
      
      await chrome.storage.local.set({ 'chaosTraderState': state });
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  async loadState() {
    try {
      const result = await chrome.storage.local.get(['chaosTraderState']);
      if (result.chaosTraderState) {
        const state = result.chaosTraderState;
        this.config = state.config || this.config;
        this.trades = state.trades || [];
        this.logs = state.logs || [];
        console.log('State loaded successfully');
      }
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  logError(action, error, data) {
    const errorLog = {
      timestamp: Date.now(),
      action,
      error: error.message,
      stack: error.stack,
      data: JSON.stringify(data),
      config: JSON.stringify(this.config)
    };
    
    this.logs.push(errorLog);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }
  }

  // Add missing utility methods
  stopAllIntervals() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.dataFlowInterval) {
      clearInterval(this.dataFlowInterval);
      this.dataFlowInterval = null;
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  async closeAllPositionsGracefully() {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'CLOSE_ALL_POSITIONS'
            });
          }
        } catch (error) {
          console.warn('Could not close positions on tab:', tab.id);
        }
      }
    } catch (error) {
      console.error('Error closing positions gracefully:', error);
    }
  }

  async closeAllPositionsEmergency() {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        try {
          if (tab.id && tab.status === 'complete') {
            await chrome.tabs.sendMessage(tab.id, {
              action: 'EMERGENCY_CLOSE_POSITIONS'
            });
          }
        } catch (error) {
          console.warn('Could not emergency close positions on tab:', tab.id);
        }
      }
    } catch (error) {
      console.error('Error during emergency position close:', error);
    }
  }

  clearPendingTrades() {
    // Clear any pending trade orders
    this.pendingTrades = [];
  }

  async logEmergencyStop() {
    try {
      const emergencyLog = {
        timestamp: Date.now(),
        action: 'EMERGENCY_STOP',
        reason: 'User initiated emergency stop',
        systemState: {
          isActive: this.isActive,
          openTrades: this.trades.filter(t => t.status === 'open').length,
          accountData: this.accountData
        }
      };
      
      this.addLog('EMERGENCY STOP EXECUTED', 'error');
      await chrome.storage.local.set({ 'emergencyLog': emergencyLog });
    } catch (error) {
      console.error('Error logging emergency stop:', error);
    }
  }

  checkDataFlowStatus() {
    try {
      const now = Date.now();
      const dataAge = now - (this.marketData.timestamp || 0);
      
      if (dataAge > 60000) { // Data older than 1 minute
        console.warn('Data flow issue detected - stale market data');
        this.addLog('Data flow warning: Market data is stale', 'warning');
      }
      
      const accountAge = now - (this.accountData.timestamp || 0);
      if (accountAge > 120000) { // Account data older than 2 minutes
        console.warn('Data flow issue detected - stale account data');
        this.addLog('Data flow warning: Account data is stale', 'warning');
      }
    } catch (error) {
      console.error('Error checking data flow status:', error);
    }
  }

  async checkEngineHealth() {
    const engines = {};
    
    try {
      engines.albrooks = this.albrooksAnalyzer ? 'healthy' : 'unhealthy';
      engines.volume = this.volumeAnalyzer ? 'healthy' : 'unhealthy';
      engines.sentiment = this.sentimentAnalyzer ? 'healthy' : 'unhealthy';
      engines.trading = this.tradingEngine ? 'healthy' : 'unhealthy';
    } catch (error) {
      engines.error = error.message;
    }
    
    return engines;
  }

  async checkDataFlow() {
    const dataFlow = {};
    
    try {
      const now = Date.now();
      dataFlow.marketData = {
        lastUpdate: this.marketData.timestamp || 0,
        age: now - (this.marketData.timestamp || 0),
        status: (now - (this.marketData.timestamp || 0)) < 60000 ? 'healthy' : 'stale'
      };
      
      dataFlow.accountData = {
        lastUpdate: this.accountData.timestamp || 0,
        age: now - (this.accountData.timestamp || 0),
        status: (now - (this.accountData.timestamp || 0)) < 120000 ? 'healthy' : 'stale'
      };
    } catch (error) {
      dataFlow.error = error.message;
    }
    
    return dataFlow;
  }

  async checkTradingHealth() {
    const trading = {};
    
    try {
      trading.isActive = this.isActive;
      trading.openTrades = this.trades.filter(t => t.status === 'open').length;
      trading.totalTrades = this.trades.length;
      trading.lastTradeTime = this.trades.length > 0 ? this.trades[this.trades.length - 1].timestamp : null;
      trading.status = this.isActive ? 'active' : 'inactive';
    } catch (error) {
      trading.error = error.message;
      trading.status = 'unhealthy';
    }
    
    return trading;
  }

  collectHealthIssues(components) {
    const issues = [];
    
    try {
      if (components.engines) {
        Object.entries(components.engines).forEach(([engine, status]) => {
          if (status !== 'healthy') {
            issues.push(`Engine ${engine} is ${status}`);
          }
        });
      }
      
      if (components.dataFlow) {
        if (components.dataFlow.marketData?.status === 'stale') {
          issues.push('Market data flow is stale');
        }
        if (components.dataFlow.accountData?.status === 'stale') {
          issues.push('Account data flow is stale');
        }
      }
      
      if (components.trading?.status === 'unhealthy') {
        issues.push('Trading system is unhealthy');
      }
    } catch (error) {
      issues.push(`Health check error: ${error.message}`);
    }
    
    return issues;
  }

  getMemoryUsage() {
    try {
      // Estimate memory usage
      const objectSizes = {
        marketData: JSON.stringify(this.marketData).length,
        accountData: JSON.stringify(this.accountData).length,
        analysisData: JSON.stringify(this.analysisData).length,
        trades: JSON.stringify(this.trades).length,
        logs: JSON.stringify(this.logs).length
      };
      
      return objectSizes;
    } catch (error) {
      return { error: error.message };
    }
  }

  async recoverStartTrading(error) {
    console.log('Recovering from start trading error:', error.message);
    
    try {
      // Try to reinitialize engines
      await this.initializeAnalysisEngines();
      
      // Reload configuration
      await this.loadStoredConfig();
      
      console.log('Start trading recovery completed');
    } catch (recoveryError) {
      console.error('Start trading recovery failed:', recoveryError);
    }
  }

  async recoverAnalysisError(error) {
    console.log('Recovering from analysis error:', error.message);
    
    try {
      // Reinitialize analysis engines
      this.albrooksAnalyzer = new AlBrooksAnalysis();
      this.volumeAnalyzer = new VolumeAnalysis();
      this.sentimentAnalyzer = new SentimentAnalysis();
      
      console.log('Analysis error recovery completed');
    } catch (recoveryError) {
      console.error('Analysis error recovery failed:', recoveryError);
    }
  }

  async recoverDataExtractionError(error) {
    console.log('Recovering from data extraction error:', error.message);
    
    try {
      // Clear stale data
      this.marketData = {};
      this.accountData = {};
      
      // Try to reinject scripts
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        if (tab.id && tab.status === 'complete') {
          await this.injectAdvancedScripts(tab.id);
        }
      }
      
      console.log('Data extraction error recovery completed');
    } catch (recoveryError) {
      console.error('Data extraction error recovery failed:', recoveryError);
    }
  }

  async recoverTradeExecutionError(error) {
    console.log('Recovering from trade execution error:', error.message);
    
    try {
      // Stop trading temporarily
      const wasActive = this.isActive;
      this.isActive = false;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try to refresh connection to trading platform
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        if (tab.id && tab.status === 'complete') {
          await chrome.tabs.reload(tab.id);
        }
      }
      
      // Restore trading state if it was active
      if (wasActive) {
        setTimeout(() => {
          this.isActive = true;
        }, 10000);
      }
      
      console.log('Trade execution error recovery completed');
    } catch (recoveryError) {
      console.error('Trade execution error recovery failed:', recoveryError);
    }
  }

  async performGeneralRecovery(error) {
    console.log('Performing general recovery for error:', error.message);
    
    try {
      // Save current state
      await this.saveState();
      
      // Clear intervals and restart
      this.stopAllIntervals();
      this.startSystemMonitoring();
      
      console.log('General recovery completed');
    } catch (recoveryError) {
      console.error('General recovery failed:', recoveryError);
    }
  }

  async recoverDataFlow() {
    console.log('Recovering data flow...');
    
    try {
      // Clear stale data
      this.marketData = {};
      this.accountData = {};
      
      // Try to reconnect to data sources
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      for (const tab of tabs) {
        if (tab.id && tab.status === 'complete') {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'RESTART_DATA_EXTRACTION'
          });
        }
      }
    } catch (error) {
      console.error('Data flow recovery failed:', error);
    }
  }

  async restartFailedEngines() {
    console.log('Restarting failed engines...');
    
    try {
      await this.initializeAnalysisEngines();
    } catch (error) {
      console.error('Engine restart failed:', error);
    }
  }

  async cleanupMemory() {
    console.log('Cleaning up memory...');
    
    try {
      // Keep only recent trades and logs
      this.trades = this.trades.slice(-50);
      this.logs = this.logs.slice(-100);
      
      // Clear old analysis data
      if (this.analysisData.timestamp && Date.now() - this.analysisData.timestamp > 300000) {
        this.analysisData = {};
      }
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  }
}

// Initialize the background service
new ChaosTraderXBackground();
