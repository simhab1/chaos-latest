class ChaosTraderXPopup {
  constructor() {
    this.isTrading = false;
    this.currentStatus = {};
    this.analysisData = {};
    this.accountData = {};
    this.trades = [];
    this.logs = [];
    
    this.init();
  }

  init() {
    this.elements = {
      statusIndicator: document.getElementById('statusIndicator'),
      statusDot: document.querySelector('.status-dot'),
      statusText: document.querySelector('.status-text'),
      
      symbolSelect: document.getElementById('symbolSelect'),
      timeframeSelect: document.getElementById('timeframeSelect'),
      autoTradingToggle: document.getElementById('autoTradingToggle'),
      confidenceThreshold: document.getElementById('confidenceThreshold'),
      confidenceValue: document.getElementById('confidenceValue'),
      maxLotSize: document.getElementById('maxLotSize'),
      sentimentFilter: document.getElementById('sentimentFilter'),
      volumeValidation: document.getElementById('volumeValidation'),
      
      startButton: document.getElementById('startButton'),
      stopButton: document.getElementById('stopButton'),
      emergencyButton: document.getElementById('emergencyButton'),
      
      marketStructure: document.getElementById('marketStructure'),
      pattern: document.getElementById('pattern'),
      signal: document.getElementById('signal'),
      confidence: document.getElementById('confidence'),
      alwaysIn: document.getElementById('alwaysIn'),
      sentiment: document.getElementById('sentiment'),
      
      balance: document.getElementById('balance'),
      equity: document.getElementById('equity'),
      margin: document.getElementById('margin'),
      openPnl: document.getElementById('openPnl'),
      todayPnl: document.getElementById('todayPnl'),
      totalPnl: document.getElementById('totalPnl'),
      openPositions: document.getElementById('openPositions'),
      totalTrades: document.getElementById('totalTrades'),
      winRate: document.getElementById('winRate'),
      
      tradesContainer: document.getElementById('tradesContainer'),
      logsContainer: document.getElementById('logsContainer')
    };

    this.setupEventListeners();
    this.loadInitialData();
    this.startUpdateIntervals();
  }

  setupEventListeners() {
    this.elements.symbolSelect.addEventListener('change', () => this.onSymbolChange());
    this.elements.timeframeSelect.addEventListener('change', () => this.onTimeframeChange());
    this.elements.confidenceThreshold.addEventListener('input', () => this.onConfidenceChange());
    this.elements.autoTradingToggle.addEventListener('change', () => this.onConfigChange());
    this.elements.maxLotSize.addEventListener('change', () => this.onConfigChange());
    this.elements.sentimentFilter.addEventListener('change', () => this.onConfigChange());
    this.elements.volumeValidation.addEventListener('change', () => this.onConfigChange());
    
    this.elements.startButton.addEventListener('click', () => this.startTrading());
    this.elements.stopButton.addEventListener('click', () => this.stopTrading());
    this.elements.emergencyButton.addEventListener('click', () => this.emergencyStop());
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleBackgroundMessage(request, sender, sendResponse);
    });
  }

  async loadInitialData() {
    try {
      const storage = await chrome.storage.local.get(['config', 'botStatus']);
      
      if (storage.config) {
        this.applyConfig(storage.config);
      }
      
      if (storage.botStatus) {
        this.updateStatus(storage.botStatus);
      }
      
      const status = await this.sendMessageToBackground('GET_STATUS');
      if (status) {
        this.updateStatus(status);
      }
      
      this.addLog('Extension initialized successfully', 'success');
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.addLog('Error loading initial data', 'error');
    }
  }

  startUpdateIntervals() {
    // Update status and analysis every 2 seconds
    setInterval(() => {
      this.updateStatus();
      this.updateAnalysis();
    }, 2000);
    
    // Update account info every 5 seconds
    setInterval(() => {
      this.updateAccountInfo();
    }, 5000);
  }

  async onSymbolChange() {
    const symbol = this.elements.symbolSelect.value;
    try {
      await this.sendMessageToBackground('SWITCH_SYMBOL', { symbol });
      this.addLog(`Switched to ${symbol}`, 'info');
    } catch (error) {
      this.addLog(`Failed to switch symbol: ${error.message}`, 'error');
    }
  }

  async onTimeframeChange() {
    const timeframe = this.elements.timeframeSelect.value;
    try {
      await this.sendMessageToBackground('SWITCH_TIMEFRAME', { timeframe });
      this.addLog(`Switched to ${timeframe}`, 'info');
    } catch (error) {
      this.addLog(`Failed to switch timeframe: ${error.message}`, 'error');
    }
  }

  onConfidenceChange() {
    const value = this.elements.confidenceThreshold.value;
    this.elements.confidenceValue.textContent = `${value}%`;
    this.onConfigChange();
  }

  async onConfigChange() {
    const config = this.getConfigFromUI();
    try {
      await this.sendMessageToBackground('UPDATE_CONFIG', config);
      this.addLog('Configuration updated', 'info');
    } catch (error) {
      this.addLog(`Config update failed: ${error.message}`, 'error');
    }
  }

  getConfigFromUI() {
    return {
      autoTrading: this.elements.autoTradingToggle.checked,
      confidenceThreshold: parseFloat(this.elements.confidenceThreshold.value),
      maxLotSize: parseFloat(this.elements.maxLotSize.value),
      sentimentFilter: this.elements.sentimentFilter.checked,
      volumeValidation: this.elements.volumeValidation.checked,
      symbol: this.elements.symbolSelect.value,
      timeframe: this.elements.timeframeSelect.value
    };
  }

  applyConfig(config) {
    if (config.autoTrading !== undefined) {
      this.elements.autoTradingToggle.checked = config.autoTrading;
    }
    if (config.confidenceThreshold !== undefined) {
      this.elements.confidenceThreshold.value = config.confidenceThreshold;
      this.elements.confidenceValue.textContent = `${config.confidenceThreshold}%`;
    }
    if (config.maxLotSize !== undefined) {
      this.elements.maxLotSize.value = config.maxLotSize;
    }
    if (config.sentimentFilter !== undefined) {
      this.elements.sentimentFilter.checked = config.sentimentFilter;
    }
    if (config.volumeValidation !== undefined) {
      this.elements.volumeValidation.checked = config.volumeValidation;
    }
    if (config.symbol !== undefined) {
      this.elements.symbolSelect.value = config.symbol;
    }
    if (config.timeframe !== undefined) {
      this.elements.timeframeSelect.value = config.timeframe;
    }
  }

  async startTrading() {
    try {
      const config = this.getConfigFromUI();
      await this.sendMessageToBackground('START_TRADING', config);
      
      this.isTrading = true;
      this.updateButtonStates();
      this.addLog('Trading started with Al Brooks analysis', 'success');
      
    } catch (error) {
      console.error('Error starting trading:', error);
      this.addLog('Failed to start trading', 'error');
    }
  }

  async stopTrading() {
    try {
      await this.sendMessageToBackground('STOP_TRADING');
      
      this.isTrading = false;
      this.updateButtonStates();
      this.addLog('Trading stopped', 'success');
      
    } catch (error) {
      console.error('Error stopping trading:', error);
      this.addLog('Failed to stop trading', 'error');
    }
  }

  async emergencyStop() {
    try {
      await this.sendMessageToBackground('EMERGENCY_STOP');
      
      this.isTrading = false;
      this.updateButtonStates();
      this.addLog('EMERGENCY STOP ACTIVATED', 'warning');
      
    } catch (error) {
      console.error('Error during emergency stop:', error);
      this.addLog('Emergency stop failed', 'error');
    }
  }

  updateButtonStates() {
    this.elements.startButton.disabled = this.isTrading;
    this.elements.stopButton.disabled = !this.isTrading;
  }

  async updateStatus() {
    try {
      const status = await this.sendMessageToBackground('GET_STATUS');
      if (status) {
        this.currentStatus = status;
        
        this.isTrading = status.isActive;
        this.elements.statusText.textContent = status.isActive ? 'Running' : 'Stopped';
        this.elements.statusDot.classList.toggle('active', status.isActive);
        
        this.updateButtonStates();
        
        if (status.totalTrades !== undefined) {
          this.elements.totalTrades.textContent = status.totalTrades;
        }
        
        if (status.accountData) {
          this.updateAccountDisplay(status.accountData);
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async updateAnalysis() {
    try {
      const analysis = await this.sendMessageToBackground('GET_ANALYSIS');
      if (analysis && analysis.albrooks) {
        this.analysisData = analysis;
        
        this.elements.marketStructure.textContent = analysis.albrooks.marketStructure || '-';
        this.elements.pattern.textContent = analysis.albrooks.pattern || '-';
        this.elements.signal.textContent = analysis.albrooks.signalBar || '-';
        this.elements.confidence.textContent = analysis.albrooks.confidence ? 
          `${analysis.albrooks.confidence.toFixed(1)}%` : '-';
        this.elements.alwaysIn.textContent = analysis.albrooks.alwaysInDirection || '-';
        
        if (analysis.sentiment) {
          this.elements.sentiment.textContent = analysis.sentiment.sentiment || '-';
        }
      }
    } catch (error) {
      console.error('Error updating analysis:', error);
    }
  }

  async updateAccountInfo() {
    try {
      const tabs = await chrome.tabs.query({ url: ['*://*.exness.com/*', '*://*.exness.global/*'] });
      if (tabs && tabs.length > 0 && tabs[0] && tabs[0].id) {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'GET_ACCOUNT_DATA' });
        if (response && response.data) {
          this.updateAccountDisplay(response.data);
        }
      }
    } catch (error) {
      // Content script might not be loaded yet
    }
  }

  updateAccountDisplay(accountData) {
    this.accountData = accountData;
    
    this.elements.balance.textContent = this.formatCurrency(accountData.balance);
    this.elements.equity.textContent = this.formatCurrency(accountData.equity);
    this.elements.margin.textContent = this.formatCurrency(accountData.margin);
    
    this.updatePnlDisplay('openPnl', accountData.openPnl || 0);
    this.updatePnlDisplay('todayPnl', accountData.todayPnl || 0);
    this.updatePnlDisplay('totalPnl', accountData.totalPnl || 0);
    
    this.elements.openPositions.textContent = accountData.openPositions || 0;
    
    const winRate = this.calculateWinRate();
    this.elements.winRate.textContent = `${winRate.toFixed(1)}%`;
  }

  updatePnlDisplay(elementId, value) {
    const element = this.elements[elementId];
    element.textContent = this.formatCurrency(value);
    element.className = 'pnl ' + (value >= 0 ? 'positive' : 'negative');
  }

  handleBackgroundMessage(request, sender, sendResponse) {
    const { action, data } = request;
    
    switch (action) {
      case 'ANALYSIS_UPDATE':
        this.analysisData = data;
        this.updateAnalysis();
        break;
        
      case 'TRADE_EXECUTED':
        this.addTrade(data);
        this.addLog(`Trade executed: ${data.signal.action} ${data.signal.symbol}`, 'success');
        break;
        
      case 'TRADE_CLOSED':
        this.addLog(`Trade closed: ${data.reason} - P&L: ${this.formatCurrency(data.pnl)}`, 
          data.pnl >= 0 ? 'success' : 'error');
        break;
        
      default:
        break;
    }
  }

  addTrade(tradeData) {
    const trade = {
      id: Date.now(),
      timestamp: new Date(),
      symbol: tradeData.signal.symbol,
      action: tradeData.signal.action,
      lotSize: tradeData.signal.lotSize,
      confidence: tradeData.signal.confidence,
      pnl: null
    };
    
    this.trades.unshift(trade);
    
    if (this.trades.length > 10) {
      this.trades = this.trades.slice(0, 10);
    }
    
    this.updateTradesDisplay();
  }

  updateTradesDisplay() {
    if (this.trades.length === 0) {
      this.elements.tradesContainer.innerHTML = '<div class="no-trades">No trades yet</div>';
      return;
    }
    
    const tradesHtml = this.trades.map(trade => `
      <div class="trade-item">
        <div class="trade-symbol">${trade.symbol}</div>
        <div class="trade-action ${trade.action.toLowerCase()}">${trade.action}</div>
        <div class="trade-lot">${trade.lotSize}</div>
        <div class="trade-confidence">${trade.confidence.toFixed(1)}%</div>
        <div class="trade-pnl ${trade.pnl >= 0 ? 'positive' : 'negative'}">
          ${trade.pnl ? this.formatCurrency(trade.pnl) : 'Open'}
        </div>
      </div>
    `).join('');
    
    this.elements.tradesContainer.innerHTML = tradesHtml;
  }

  addLog(message, type = 'info') {
    const log = {
      id: Date.now(),
      timestamp: new Date(),
      message,
      type
    };
    
    this.logs.unshift(log);
    
    if (this.logs.length > 20) {
      this.logs = this.logs.slice(0, 20);
    }
    
    this.updateLogsDisplay();
  }

  updateLogsDisplay() {
    const logsHtml = this.logs.map(log => `
      <div class="log-item ${log.type}">
        ${this.formatTime(log.timestamp)} - ${log.message}
      </div>
    `).join('');
    
    this.elements.logsContainer.innerHTML = logsHtml;
  }

  formatCurrency(amount) {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${parseFloat(amount).toFixed(2)}`;
  }

  formatTime(date) {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  calculateWinRate() {
    if (this.trades.length === 0) return 0;
    
    const completedTrades = this.trades.filter(trade => trade.pnl !== null);
    if (completedTrades.length === 0) return 0;
    
    const winningTrades = completedTrades.filter(trade => trade.pnl > 0);
    return (winningTrades.length / completedTrades.length) * 100;
  }

  async sendMessageToBackground(action, data = null) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action, data }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('Background message error:', chrome.runtime.lastError.message);
            resolve(null);
          } else if (response && response.success !== false) {
            resolve(response);
          } else {
            console.warn('Background response error:', response?.error || 'Unknown error');
            resolve(null);
          }
        });
      } catch (error) {
        console.warn('Message sending error:', error);
        resolve(null);
      }
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ChaosTraderXPopup();
});
