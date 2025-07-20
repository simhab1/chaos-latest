export class TradingEngine {
  constructor() {
    this.isInitialized = false;
    this.config = {};
    this.isActive = false;
    this.positions = [];
    this.tradeHistory = [];
    this.riskManager = new RiskManager();
    
    this.tradingRules = {
      maxPositions: 3,
      maxDailyTrades: 10,
      maxDrawdown: 0.05, // 5%
      minConfidence: 95,
      cooldownPeriod: 300000 // 5 minutes between trades
    };
    
    this.lastTradeTime = 0;
    this.dailyTradeCount = 0;
    this.lastResetDate = new Date().toDateString();
  }

  async initialize(config) {
    this.config = { ...this.config, ...config };
    this.isInitialized = true;
    this.isActive = false;
    
    // Reset daily counters if new day
    this.checkDailyReset();
    
    console.log('Trading Engine initialized with config:', this.config);
  }

  async start() {
    if (!this.isInitialized) {
      throw new Error('Trading engine not initialized');
    }
    
    this.isActive = true;
    console.log('Trading Engine started');
  }

  async stop() {
    this.isActive = false;
    console.log('Trading Engine stopped');
  }

  async emergencyStop() {
    this.isActive = false;
    // Additional emergency procedures could be added here
    console.log('Trading Engine emergency stop activated');
  }

  async evaluateSignal(analysisData, config, accountData) {
    if (!this.isActive || !this.isInitialized) {
      return null;
    }

    try {
      // Check daily limits
      this.checkDailyReset();
      if (this.dailyTradeCount >= this.tradingRules.maxDailyTrades) {
        console.log('Daily trade limit reached');
        return null;
      }

      // Check cooldown period
      if (Date.now() - this.lastTradeTime < this.tradingRules.cooldownPeriod) {
        console.log('Cooldown period active');
        return null;
      }

      // Check maximum positions
      if (this.positions.length >= this.tradingRules.maxPositions) {
        console.log('Maximum positions reached');
        return null;
      }

      // Extract analysis components
      const { albrooks, volume, sentiment } = analysisData;
      
      if (!albrooks || !volume) {
        console.log('Insufficient analysis data');
        return null;
      }

      // Generate trading signal
      const signal = this.generateTradingSignal(albrooks, volume, sentiment, config);
      
      if (!signal) {
        return null;
      }

      // Apply risk management
      const riskAssessment = this.riskManager.assessTrade(signal, accountData, this.positions);
      
      if (!riskAssessment.approved) {
        console.log('Trade rejected by risk management:', riskAssessment.reason);
        return null;
      }

      // Apply position sizing
      signal.lotSize = this.calculatePositionSize(signal, accountData, riskAssessment);
      
      // Final validation
      if (this.validateSignal(signal, config)) {
        console.log('Trading signal generated:', signal);
        return signal;
      }

      return null;
      
    } catch (error) {
      console.error('Error evaluating trading signal:', error);
      return null;
    }
  }

  generateTradingSignal(albrooks, volume, sentiment, config) {
    // Check Al Brooks confidence first
    if (albrooks.confidence < config.confidenceThreshold) {
      return null;
    }

    // Determine signal direction based on Al Brooks analysis
    let action = null;
    let confidence = albrooks.confidence;

    if (albrooks.recommendation === 'BUY' && 
        albrooks.alwaysInDirection === 'ALWAYS_IN_LONG' &&
        albrooks.signalQuality > 0.7) {
      action = 'BUY';
    } else if (albrooks.recommendation === 'SELL' && 
               albrooks.alwaysInDirection === 'ALWAYS_IN_SHORT' &&
               albrooks.signalQuality > 0.7) {
      action = 'SELL';
    }

    if (!action) {
      return null;
    }

    // Apply volume confirmation if enabled
    if (config.volumeValidation) {
      if (!volume.hasVolumeSpike && !volume.hasBreakout) {
        console.log('Signal filtered out: insufficient volume confirmation');
        return null;
      }
      
      // Boost confidence with volume confirmation
      if (volume.confidence > 0.7) {
        confidence += volume.confidence * 5; // Add up to 5% confidence
      }
    }

    // Apply sentiment filter if enabled
    if (config.sentimentFilter && sentiment) {
      if (sentiment.recommendation === 'FILTER_OUT') {
        console.log('Signal filtered out by sentiment:', sentiment.reason);
        return null;
      }
    }

    // Calculate stop loss and take profit levels
    const priceData = this.extractPriceData(albrooks);
    const sltp = this.calculateStopLossTakeProfit(action, priceData, albrooks);

    const signal = {
      id: Date.now(),
      action,
      symbol: config.symbol,
      timeframe: config.timeframe,
      confidence: Math.min(99, confidence),
      lotSize: config.maxLotSize, // Will be adjusted by position sizing
      stopLoss: sltp.stopLoss,
      takeProfit: sltp.takeProfit,
      reasoning: this.generateSignalReasoning(albrooks, volume, sentiment),
      analysis: {
        albrooks: {
          pattern: albrooks.pattern,
          signalBar: albrooks.signalBar,
          marketStructure: albrooks.marketStructure,
          trend: albrooks.trend
        },
        volume: volume.hasVolumeSpike ? 'CONFIRMED' : 'NORMAL',
        sentiment: sentiment ? sentiment.sentiment : 'NEUTRAL'
      },
      timestamp: Date.now()
    };

    return signal;
  }

  calculatePositionSize(signal, accountData, riskAssessment) {
    const { balance, equity } = accountData;
    const maxRiskAmount = (balance || equity || 1000) * riskAssessment.maxRisk;
    
    // Calculate position size based on stop loss distance
    const stopLossDistance = Math.abs(signal.stopLoss - this.getCurrentPrice(signal.symbol));
    const maxLotSize = maxRiskAmount / stopLossDistance;
    
    // Apply maximum lot size limit
    const finalLotSize = Math.min(maxLotSize, this.config.maxLotSize || 0.01);
    
    return Math.max(0.01, parseFloat(finalLotSize.toFixed(2)));
  }

  calculateStopLossTakeProfit(action, priceData, albrooks) {
    const currentPrice = priceData.currentPrice;
    const atr = priceData.atr || (currentPrice * 0.01); // Default 1% ATR
    
    let stopLoss, takeProfit;
    
    if (action === 'BUY') {
      // Use support level or ATR-based stop loss
      stopLoss = albrooks.support && albrooks.support > 0 ? 
        albrooks.support : currentPrice - (atr * 2);
      takeProfit = currentPrice + (atr * 3); // 1.5:1 risk/reward ratio
    } else { // SELL
      // Use resistance level or ATR-based stop loss
      stopLoss = albrooks.resistance && albrooks.resistance > 0 ? 
        albrooks.resistance : currentPrice + (atr * 2);
      takeProfit = currentPrice - (atr * 3); // 1.5:1 risk/reward ratio
    }
    
    return {
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5))
    };
  }

  validateSignal(signal, config) {
    // Final validation checks
    if (!signal.action || !signal.symbol) {
      return false;
    }
    
    if (signal.confidence < config.confidenceThreshold) {
      return false;
    }
    
    if (signal.lotSize <= 0 || signal.lotSize > config.maxLotSize) {
      return false;
    }
    
    return true;
  }

  recordTrade(signal, result) {
    this.tradeHistory.push({
      signal,
      result,
      timestamp: Date.now()
    });
    
    this.lastTradeTime = Date.now();
    this.dailyTradeCount++;
    
    // Keep only last 100 trades
    if (this.tradeHistory.length > 100) {
      this.tradeHistory = this.tradeHistory.slice(-100);
    }
  }

  checkDailyReset() {
    const currentDate = new Date().toDateString();
    if (currentDate !== this.lastResetDate) {
      this.dailyTradeCount = 0;
      this.lastResetDate = currentDate;
    }
  }

  extractPriceData(albrooks) {
    // Extract price data from Al Brooks analysis
    return {
      currentPrice: 0, // This would be set from current market data
      atr: 0, // Average True Range - would be calculated from candle data
      support: albrooks.support,
      resistance: albrooks.resistance
    };
  }

  getCurrentPrice(symbol) {
    // This would get current price from market data
    // For now return a placeholder
    return 50000; // Default BTC price
  }

  generateSignalReasoning(albrooks, volume, sentiment) {
    const reasons = [];
    
    reasons.push(`Al Brooks: ${albrooks.pattern} pattern with ${albrooks.signalBar} signal bar`);
    reasons.push(`Market structure: ${albrooks.marketStructure}`);
    reasons.push(`Always-in direction: ${albrooks.alwaysInDirection}`);
    
    if (volume.hasVolumeSpike) {
      reasons.push('Volume spike confirmation');
    }
    
    if (volume.hasBreakout) {
      reasons.push('Breakout volume confirmation');
    }
    
    if (sentiment && sentiment.sentiment !== 'NEUTRAL') {
      reasons.push(`Sentiment: ${sentiment.sentiment}`);
    }
    
    return reasons.join('; ');
  }

  getStatistics() {
    const totalTrades = this.tradeHistory.length;
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        profitFactor: 0,
        maxDrawdown: 0
      };
    }

    const winningTrades = this.tradeHistory.filter(trade => 
      trade.result && trade.result.pnl > 0
    ).length;

    return {
      totalTrades,
      winRate: (winningTrades / totalTrades) * 100,
      profitFactor: this.calculateProfitFactor(),
      maxDrawdown: this.calculateMaxDrawdown(),
      dailyTradeCount: this.dailyTradeCount
    };
  }

  calculateProfitFactor() {
    let totalProfit = 0;
    let totalLoss = 0;

    for (const trade of this.tradeHistory) {
      if (trade.result && trade.result.pnl) {
        if (trade.result.pnl > 0) {
          totalProfit += trade.result.pnl;
        } else {
          totalLoss += Math.abs(trade.result.pnl);
        }
      }
    }

    return totalLoss > 0 ? totalProfit / totalLoss : 0;
  }

  calculateMaxDrawdown() {
    // Calculate maximum drawdown from trade history
    let peak = 0;
    let maxDrawdown = 0;
    let runningPnL = 0;

    for (const trade of this.tradeHistory) {
      if (trade.result && trade.result.pnl) {
        runningPnL += trade.result.pnl;
        
        if (runningPnL > peak) {
          peak = runningPnL;
        }
        
        const drawdown = (peak - runningPnL) / peak;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
    }

    return maxDrawdown;
  }
}

class RiskManager {
  constructor() {
    this.maxRiskPerTrade = 0.02; // 2% per trade
    this.maxDailyRisk = 0.05; // 5% per day
    this.maxDrawdown = 0.10; // 10% maximum drawdown
  }

  assessTrade(signal, accountData, currentPositions) {
    const assessment = {
      approved: false,
      maxRisk: this.maxRiskPerTrade,
      reason: ''
    };

    // Check account balance
    const balance = accountData.balance || accountData.equity || 1000;
    if (balance < 100) {
      assessment.reason = 'Insufficient account balance';
      return assessment;
    }

    // Check current exposure
    const currentExposure = this.calculateCurrentExposure(currentPositions, balance);
    if (currentExposure > this.maxDailyRisk) {
      assessment.reason = 'Maximum daily risk exposure reached';
      return assessment;
    }

    // Check drawdown
    const currentDrawdown = this.calculateCurrentDrawdown(accountData);
    if (currentDrawdown > this.maxDrawdown) {
      assessment.reason = 'Maximum drawdown exceeded';
      assessment.maxRisk = this.maxRiskPerTrade * 0.5; // Reduce risk
    }

    // Adjust risk based on confidence
    if (signal.confidence > 95) {
      assessment.maxRisk = Math.min(this.maxRiskPerTrade * 1.2, 0.025);
    } else if (signal.confidence < 90) {
      assessment.maxRisk = this.maxRiskPerTrade * 0.8;
    }

    assessment.approved = true;
    return assessment;
  }

  calculateCurrentExposure(positions, balance) {
    let totalExposure = 0;
    
    for (const position of positions) {
      const positionValue = position.lotSize * position.currentPrice || 0;
      totalExposure += positionValue;
    }
    
    return totalExposure / balance;
  }

  calculateCurrentDrawdown(accountData) {
    const { balance, equity } = accountData;
    if (!balance || !equity) return 0;
    
    return Math.max(0, (balance - equity) / balance);
  }
}
