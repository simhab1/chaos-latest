export class AlBrooksAnalysis {
  constructor() {
    this.config = {
      minBarsForAnalysis: 20,
      strongBarThreshold: 0.6,
      trendBarsRequired: 3,
      reverseBarThreshold: 0.8
    };
    
    this.patterns = {
      BULL_FLAG: 'Bull Flag',
      BEAR_FLAG: 'Bear Flag',
      WEDGE_TOP: 'Wedge Top',
      WEDGE_BOTTOM: 'Wedge Bottom',
      TRIANGLE: 'Triangle',
      CHANNEL: 'Channel',
      BREAKOUT: 'Breakout',
      REVERSAL: 'Reversal'
    };
    
    this.lastAnalysis = null;
  }

  async analyze(candles, timeframe = 'M15') {
    if (!candles || candles.length < this.config.minBarsForAnalysis) {
      return this.getEmptyAnalysis();
    }

    const bars = this.normalizeBars(candles);
    
    // Core Al Brooks Analysis Components
    const marketStructure = this.analyzeMarketStructure(bars);
    const trendAnalysis = this.analyzeTrend(bars);
    const priceAction = this.analyzePriceAction(bars);
    const patterns = this.identifyPatterns(bars);
    const signalBars = this.identifySignalBars(bars);
    const alwaysInDirection = this.determineAlwaysIn(bars, trendAnalysis);
    const tradingRangeAnalysis = this.analyzeTradingRange(bars);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      marketStructure,
      trendAnalysis,
      priceAction,
      patterns,
      signalBars
    );

    const analysis = {
      timeframe,
      marketStructure: marketStructure.structure,
      trend: trendAnalysis.direction,
      trendStrength: trendAnalysis.strength,
      pattern: patterns.primary,
      patternStrength: patterns.strength,
      signalBar: signalBars.current,
      signalQuality: signalBars.quality,
      alwaysInDirection,
      priceActionSetup: priceAction.setup,
      tradingRange: tradingRangeAnalysis.inRange,
      support: priceAction.support,
      resistance: priceAction.resistance,
      confidence,
      recommendation: this.generateRecommendation(confidence, signalBars, trendAnalysis),
      timestamp: Date.now()
    };

    this.lastAnalysis = analysis;
    return analysis;
  }

  normalizeBars(candles) {
    return candles.map(candle => ({
      timestamp: candle.timestamp || Date.now(),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume) || 0
    })).filter(bar => !isNaN(bar.open) && !isNaN(bar.high) && !isNaN(bar.low) && !isNaN(bar.close));
  }

  analyzeMarketStructure(bars) {
    const recent = bars.slice(-10);
    const highs = recent.map(bar => bar.high);
    const lows = recent.map(bar => bar.low);
    
    const higherHighs = this.countConsecutivePattern(highs, (a, b) => b > a);
    const higherLows = this.countConsecutivePattern(lows, (a, b) => b > a);
    const lowerHighs = this.countConsecutivePattern(highs, (a, b) => b < a);
    const lowerLows = this.countConsecutivePattern(lows, (a, b) => b < a);
    
    let structure = 'SIDEWAYS';
    let strength = 0;
    
    if (higherHighs >= 2 && higherLows >= 2) {
      structure = 'BULL_TREND';
      strength = Math.min(higherHighs + higherLows, 10) / 10;
    } else if (lowerHighs >= 2 && lowerLows >= 2) {
      structure = 'BEAR_TREND';
      strength = Math.min(lowerHighs + lowerLows, 10) / 10;
    } else if (higherHighs >= 2 && lowerLows >= 2) {
      structure = 'EXPANDING_RANGE';
      strength = 0.3;
    } else if (lowerHighs >= 2 && higherLows >= 2) {
      structure = 'CONTRACTING_RANGE';
      strength = 0.4;
    }
    
    return { structure, strength };
  }

  analyzeTrend(bars) {
    const ema20 = this.calculateEMA(bars, 20);
    const ema50 = this.calculateEMA(bars, 50);
    
    const currentPrice = bars[bars.length - 1].close;
    const ema20Current = ema20[ema20.length - 1];
    const ema50Current = ema50[ema50.length - 1];
    
    let direction = 'NEUTRAL';
    let strength = 0;
    
    if (currentPrice > ema20Current && ema20Current > ema50Current) {
      direction = 'BULLISH';
      const priceAboveEma = (currentPrice - ema20Current) / ema20Current;
      const emaSlope = (ema20Current - ema20[ema20.length - 5]) / ema20[ema20.length - 5];
      strength = Math.min(priceAboveEma * 10 + emaSlope * 5, 1);
    } else if (currentPrice < ema20Current && ema20Current < ema50Current) {
      direction = 'BEARISH';
      const priceBelowEma = (ema20Current - currentPrice) / ema20Current;
      const emaSlope = (ema20[ema20.length - 5] - ema20Current) / ema20Current;
      strength = Math.min(priceBelowEma * 10 + emaSlope * 5, 1);
    }
    
    return { direction, strength };
  }

  analyzePriceAction(bars) {
    const recent = bars.slice(-5);
    const current = bars[bars.length - 1];
    
    // Identify key support and resistance levels
    const highs = bars.slice(-20).map(bar => bar.high);
    const lows = bars.slice(-20).map(bar => bar.low);
    
    const resistance = this.findKeyLevel(highs, 'resistance');
    const support = this.findKeyLevel(lows, 'support');
    
    // Analyze current bar characteristics
    const bodySize = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    const bodyRatio = range > 0 ? bodySize / range : 0;
    
    const upperWick = current.high - Math.max(current.open, current.close);
    const lowerWick = Math.min(current.open, current.close) - current.low;
    
    let setup = 'NONE';
    
    if (bodyRatio > this.config.strongBarThreshold) {
      setup = current.close > current.open ? 'STRONG_BULL_BAR' : 'STRONG_BEAR_BAR';
    } else if (upperWick > bodySize * 2) {
      setup = 'SHOOTING_STAR';
    } else if (lowerWick > bodySize * 2) {
      setup = 'HAMMER';
    } else if (bodyRatio < 0.3) {
      setup = 'DOJI';
    }
    
    return { setup, support, resistance, bodyRatio };
  }

  identifyPatterns(bars) {
    const patterns = [];
    
    // Bull Flag Pattern
    if (this.isBullFlag(bars)) {
      patterns.push({ type: this.patterns.BULL_FLAG, strength: 0.8 });
    }
    
    // Bear Flag Pattern
    if (this.isBearFlag(bars)) {
      patterns.push({ type: this.patterns.BEAR_FLAG, strength: 0.8 });
    }
    
    // Wedge Patterns
    const wedge = this.identifyWedge(bars);
    if (wedge) {
      patterns.push(wedge);
    }
    
    // Triangle Pattern
    if (this.isTriangle(bars)) {
      patterns.push({ type: this.patterns.TRIANGLE, strength: 0.6 });
    }
    
    // Channel Pattern
    if (this.isChannel(bars)) {
      patterns.push({ type: this.patterns.CHANNEL, strength: 0.5 });
    }
    
    // Breakout Pattern
    if (this.isBreakout(bars)) {
      patterns.push({ type: this.patterns.BREAKOUT, strength: 0.9 });
    }
    
    // Select strongest pattern
    const primary = patterns.length > 0 ? 
      patterns.reduce((max, p) => p.strength > max.strength ? p : max) : 
      { type: 'NONE', strength: 0 };
    
    return { primary: primary.type, strength: primary.strength, all: patterns };
  }

  identifySignalBars(bars) {
    const current = bars[bars.length - 1];
    const previous = bars[bars.length - 2];
    
    if (!previous) {
      return { current: 'NONE', quality: 0 };
    }
    
    const bodySize = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    const bodyRatio = range > 0 ? bodySize / range : 0;
    
    let signalType = 'NONE';
    let quality = 0;
    
    // Strong Bull Signal Bar
    if (current.close > current.open && 
        bodyRatio > this.config.strongBarThreshold &&
        current.close > previous.high) {
      signalType = 'STRONG_BULL_SIGNAL';
      quality = bodyRatio;
    }
    // Strong Bear Signal Bar
    else if (current.close < current.open && 
             bodyRatio > this.config.strongBarThreshold &&
             current.close < previous.low) {
      signalType = 'STRONG_BEAR_SIGNAL';
      quality = bodyRatio;
    }
    // Bull Reversal Bar
    else if (current.close > current.open &&
             current.low < previous.low &&
             current.close > previous.close) {
      signalType = 'BULL_REVERSAL';
      quality = 0.7;
    }
    // Bear Reversal Bar
    else if (current.close < current.open &&
             current.high > previous.high &&
             current.close < previous.close) {
      signalType = 'BEAR_REVERSAL';
      quality = 0.7;
    }
    
    return { current: signalType, quality };
  }

  determineAlwaysIn(bars, trendAnalysis) {
    // Al Brooks "Always In" concept
    const recent = bars.slice(-10);
    const ema20 = this.calculateEMA(bars, 20);
    const currentEma = ema20[ema20.length - 1];
    const currentPrice = bars[bars.length - 1].close;
    
    // Count trend bars
    let bullBars = 0;
    let bearBars = 0;
    
    for (let i = recent.length - this.config.trendBarsRequired; i < recent.length; i++) {
      if (recent[i].close > recent[i].open) bullBars++;
      if (recent[i].close < recent[i].open) bearBars++;
    }
    
    if (trendAnalysis.direction === 'BULLISH' && 
        currentPrice > currentEma && 
        bullBars >= this.config.trendBarsRequired) {
      return 'ALWAYS_IN_LONG';
    } else if (trendAnalysis.direction === 'BEARISH' && 
               currentPrice < currentEma && 
               bearBars >= this.config.trendBarsRequired) {
      return 'ALWAYS_IN_SHORT';
    }
    
    return 'NEUTRAL';
  }

  analyzeTradingRange(bars) {
    const recent = bars.slice(-20);
    const highs = recent.map(bar => bar.high);
    const lows = recent.map(bar => bar.low);
    
    const maxHigh = Math.max(...highs);
    const minLow = Math.min(...lows);
    const range = maxHigh - minLow;
    const currentPrice = bars[bars.length - 1].close;
    
    // Check if price is oscillating within a range
    const priceMovement = Math.abs(highs[highs.length - 1] - highs[0]) / range;
    const inRange = priceMovement < 0.3;
    
    let position = 'MIDDLE';
    const pricePosition = (currentPrice - minLow) / range;
    
    if (pricePosition > 0.7) position = 'TOP';
    else if (pricePosition < 0.3) position = 'BOTTOM';
    
    return { inRange, position, range };
  }

  calculateConfidence(marketStructure, trendAnalysis, priceAction, patterns, signalBars) {
    let confidence = 0.5; // Base confidence
    
    // Market structure adds confidence
    confidence += marketStructure.strength * 0.25;
    
    // Trend strength adds confidence
    confidence += trendAnalysis.strength * 0.25;
    
    // Pattern strength adds confidence
    confidence += patterns.strength * 0.2;
    
    // Signal bar quality adds confidence
    confidence += signalBars.quality * 0.2;
    
    // Strong price action setup adds confidence
    if (priceAction.bodyRatio > this.config.strongBarThreshold) {
      confidence += 0.1;
    }
    
    return Math.min(1, Math.max(0, confidence)) * 100; // Convert to percentage
  }

  generateRecommendation(confidence, signalBars, trendAnalysis) {
    if (confidence < 85) {
      return 'NO_TRADE';
    }
    
    if (signalBars.current === 'STRONG_BULL_SIGNAL' && trendAnalysis.direction === 'BULLISH') {
      return 'BUY';
    } else if (signalBars.current === 'STRONG_BEAR_SIGNAL' && trendAnalysis.direction === 'BEARISH') {
      return 'SELL';
    } else if (signalBars.current === 'BULL_REVERSAL') {
      return 'BUY';
    } else if (signalBars.current === 'BEAR_REVERSAL') {
      return 'SELL';
    }
    
    return 'WAIT';
  }

  // Helper Methods
  countConsecutivePattern(array, compareFn) {
    let count = 0;
    for (let i = 1; i < array.length; i++) {
      if (compareFn(array[i - 1], array[i])) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  calculateEMA(bars, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for first value
    let sum = 0;
    for (let i = 0; i < period && i < bars.length; i++) {
      sum += bars[i].close;
    }
    ema.push(sum / Math.min(period, bars.length));
    
    // Calculate EMA for remaining values
    for (let i = Math.min(period, bars.length); i < bars.length; i++) {
      const newEma = (bars[i].close * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(newEma);
    }
    
    return ema;
  }

  findKeyLevel(values, type) {
    const sorted = [...values].sort((a, b) => type === 'resistance' ? b - a : a - b);
    const clusters = [];
    
    // Group similar values (within 0.1% of each other)
    for (const value of sorted) {
      let foundCluster = false;
      for (const cluster of clusters) {
        if (Math.abs(value - cluster.level) / cluster.level < 0.001) {
          cluster.count++;
          foundCluster = true;
          break;
        }
      }
      
      if (!foundCluster) {
        clusters.push({ level: value, count: 1 });
      }
    }
    
    // Return level with highest count
    const strongest = clusters.reduce((max, cluster) => 
      cluster.count > max.count ? cluster : max, clusters[0]);
    
    return strongest ? strongest.level : sorted[0];
  }

  // Pattern Recognition Methods
  isBullFlag(bars) {
    if (bars.length < 10) return false;
    
    const flagStart = bars.length - 8;
    const poleEnd = bars.length - 5;
    
    // Check for strong bullish move (pole)
    let bullishMove = true;
    for (let i = flagStart; i < poleEnd; i++) {
      if (bars[i].close <= bars[i - 1].close) {
        bullishMove = false;
        break;
      }
    }
    
    if (!bullishMove) return false;
    
    // Check for consolidation (flag)
    const flagBars = bars.slice(poleEnd);
    const flagHigh = Math.max(...flagBars.map(bar => bar.high));
    const flagLow = Math.min(...flagBars.map(bar => bar.low));
    const flagRange = flagHigh - flagLow;
    const poleRange = bars[poleEnd - 1].high - bars[flagStart].low;
    
    return flagRange < poleRange * 0.5;
  }

  isBearFlag(bars) {
    if (bars.length < 10) return false;
    
    const flagStart = bars.length - 8;
    const poleEnd = bars.length - 5;
    
    // Check for strong bearish move (pole)
    let bearishMove = true;
    for (let i = flagStart; i < poleEnd; i++) {
      if (bars[i].close >= bars[i - 1].close) {
        bearishMove = false;
        break;
      }
    }
    
    if (!bearishMove) return false;
    
    // Check for consolidation (flag)
    const flagBars = bars.slice(poleEnd);
    const flagHigh = Math.max(...flagBars.map(bar => bar.high));
    const flagLow = Math.min(...flagBars.map(bar => bar.low));
    const flagRange = flagHigh - flagLow;
    const poleRange = bars[flagStart].high - bars[poleEnd - 1].low;
    
    return flagRange < poleRange * 0.5;
  }

  identifyWedge(bars) {
    if (bars.length < 15) return null;
    
    const recent = bars.slice(-15);
    const highs = recent.map(bar => bar.high);
    const lows = recent.map(bar => bar.low);
    
    // Calculate trend lines
    const highTrend = this.calculateTrendLine(highs);
    const lowTrend = this.calculateTrendLine(lows);
    
    // Check if lines are converging
    const isConverging = Math.abs(highTrend.slope) > Math.abs(lowTrend.slope) * 0.5 &&
                        Math.abs(highTrend.slope) < Math.abs(lowTrend.slope) * 2;
    
    if (isConverging) {
      if (highTrend.slope < 0 && lowTrend.slope > 0) {
        return { type: this.patterns.WEDGE_TOP, strength: 0.7 };
      } else if (highTrend.slope > 0 && lowTrend.slope < 0) {
        return { type: this.patterns.WEDGE_BOTTOM, strength: 0.7 };
      }
    }
    
    return null;
  }

  isTriangle(bars) {
    if (bars.length < 15) return false;
    
    const recent = bars.slice(-15);
    const highs = recent.map(bar => bar.high);
    const lows = recent.map(bar => bar.low);
    
    const highRange = Math.max(...highs) - Math.min(...highs);
    const lowRange = Math.max(...lows) - Math.min(...lows);
    const totalRange = Math.max(...highs) - Math.min(...lows);
    
    // Triangle has converging highs and lows
    return (highRange + lowRange) / totalRange < 0.6;
  }

  isChannel(bars) {
    if (bars.length < 20) return false;
    
    const recent = bars.slice(-20);
    const highs = recent.map(bar => bar.high);
    const lows = recent.map(bar => bar.low);
    
    const highTrend = this.calculateTrendLine(highs);
    const lowTrend = this.calculateTrendLine(lows);
    
    // Parallel lines indicate channel
    return Math.abs(highTrend.slope - lowTrend.slope) < 0.001;
  }

  isBreakout(bars) {
    if (bars.length < 10) return false;
    
    const current = bars[bars.length - 1];
    const recent = bars.slice(-10, -1);
    const recentHigh = Math.max(...recent.map(bar => bar.high));
    const recentLow = Math.min(...recent.map(bar => bar.low));
    
    return current.high > recentHigh || current.low < recentLow;
  }

  calculateTrendLine(values) {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  getEmptyAnalysis() {
    return {
      timeframe: 'M15',
      marketStructure: 'UNKNOWN',
      trend: 'NEUTRAL',
      trendStrength: 0,
      pattern: 'NONE',
      patternStrength: 0,
      signalBar: 'NONE',
      signalQuality: 0,
      alwaysInDirection: 'NEUTRAL',
      priceActionSetup: 'NONE',
      tradingRange: false,
      support: 0,
      resistance: 0,
      confidence: 0,
      recommendation: 'NO_TRADE',
      timestamp: Date.now()
    };
  }
}
