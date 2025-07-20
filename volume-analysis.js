export class VolumeAnalysis {
  constructor() {
    this.config = {
      spikeThreshold: 2.0,      // Volume spike threshold (2x average)
      orderBlockMinVolume: 1.5,  // Minimum volume for order block detection
      breakoutVolumeRatio: 1.8,  // Volume ratio for breakout confirmation
      lookbackPeriod: 20,        // Periods to look back for calculations
      institutionalThreshold: 3.0 // Threshold for institutional activity
    };

    this.volumeHistory = [];
    this.orderBlocks = [];
    this.lastAnalysis = null;
  }

  analyzeVolumeData(candles, timeframe = 'M15') {
    if (!candles || candles.length < this.config.lookbackPeriod) {
      return this.getEmptyAnalysis();
    }

    // Filter candles with volume data
    const validCandles = candles.filter(c => c.volume && parseFloat(c.volume) > 0);
    if (validCandles.length < 10) {
      return this.getEmptyAnalysis();
    }

    const volumes = validCandles.map(c => parseFloat(c.volume));
    const prices = validCandles.map(c => ({
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseFloat(c.volume)
    }));

    // Calculate volume metrics
    const avgVolume = this.calculateAverageVolume(volumes);
    const volumeTrend = this.calculateVolumeTrend(volumes);
    const volumeSpikes = this.detectVolumeSpikes(validCandles);
    const orderBlocks = this.detectOrderBlocks(validCandles);
    const breakoutSignals = this.analyzeBreakoutVolume(validCandles);
    const institutionalActivity = this.detectInstitutionalActivity(validCandles);
    const volumeProfile = this.buildVolumeProfile(validCandles);

    // Calculate overall confidence
    const confidence = this.calculateVolumeConfidence(
      volumeSpikes,
      orderBlocks,
      breakoutSignals,
      institutionalActivity,
      volumeTrend
    );

    const analysis = {
      timeframe,
      avgVolume,
      currentVolume: volumes[volumes.length - 1],
      volumeTrend,
      volumeSpikes,
      orderBlocks,
      breakoutSignals,
      institutionalActivity,
      volumeProfile,
      confidence,
      hasOrderBlocks: orderBlocks.length > 0,
      hasVolumeSpike: volumeSpikes.length > 0,
      hasBreakout: breakoutSignals.breakoutDetected,
      hasInstitutional: institutionalActivity.detected,
      timestamp: Date.now()
    };

    this.lastAnalysis = analysis;
    this.orderBlocks = orderBlocks;

    return analysis;
  }

  calculateAverageVolume(volumes) {
    if (volumes.length === 0) return 0;
    return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  }

  calculateVolumeTrend(volumes) {
    if (volumes.length < 5) return 0;

    const recent = volumes.slice(-5);
    const earlier = volumes.slice(-10, -5);

    const recentAvg = recent.reduce((sum, vol) => sum + vol, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, vol) => sum + vol, 0) / earlier.length;

    return (recentAvg - earlierAvg) / earlierAvg;
  }

  detectVolumeSpikes(candles) {
    const volumes = candles.map(c => parseFloat(c.volume));
    const avgVolume = this.calculateAverageVolume(volumes);
    const spikes = [];

    for (let i = 0; i < candles.length; i++) {
      const volume = parseFloat(candles[i].volume);
      const spikeRatio = volume / avgVolume;

      if (spikeRatio >= this.config.spikeThreshold) {
        spikes.push({
          index: i,
          volume,
          avgVolume,
          ratio: spikeRatio,
          price: parseFloat(candles[i].close),
          timestamp: candles[i].timestamp || Date.now(),
          significance: this.calculateSpikeSignificance(spikeRatio)
        });
      }
    }

    return spikes;
  }

  detectOrderBlocks(candles) {
    const orderBlocks = [];
    const volumes = candles.map(c => parseFloat(c.volume));
    const avgVolume = this.calculateAverageVolume(volumes);

    for (let i = 2; i < candles.length - 2; i++) {
      const candle = candles[i];
      const volume = parseFloat(candle.volume);
      const volumeRatio = volume / avgVolume;

      // Check for order block criteria
      if (volumeRatio >= this.config.orderBlockMinVolume) {
        const priceAction = this.analyzePriceAction(candles, i);

        if (this.isOrderBlockPattern(priceAction, volumeRatio)) {
          orderBlocks.push({
            index: i,
            type: priceAction.direction,
            volume,
            volumeRatio,
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            open: parseFloat(candle.open),
            close: parseFloat(candle.close),
            strength: this.calculateOrderBlockStrength(volumeRatio, priceAction),
            timestamp: candle.timestamp || Date.now()
          });
        }
      }
    }

    return orderBlocks;
  }

  analyzeBreakoutVolume(candles) {
    if (candles.length < 10) {
      return { breakoutDetected: false, confidence: 0 };
    }

    const volumes = candles.map(c => parseFloat(c.volume));
    const prices = candles.map(c => parseFloat(c.close));
    const avgVolume = this.calculateAverageVolume(volumes.slice(0, -1));
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    // Check for price breakout
    const priceBreakout = this.detectPriceBreakout(candles);

    // Confirm with volume
    const volumeConfirmation = volumeRatio >= this.config.breakoutVolumeRatio;

    return {
      breakoutDetected: priceBreakout.detected && volumeConfirmation,
      direction: priceBreakout.direction,
      volumeRatio,
      priceChange: priceBreakout.priceChange,
      confidence: this.calculateBreakoutConfidence(volumeRatio, priceBreakout),
      timestamp: Date.now()
    };
  }

  detectInstitutionalActivity(candles) {
    const volumes = candles.map(c => parseFloat(c.volume));
    const avgVolume = this.calculateAverageVolume(volumes);
    const institutionalSignals = [];

    for (let i = 0; i < candles.length; i++) {
      const volume = parseFloat(candles[i].volume);
      const ratio = volume / avgVolume;

      if (ratio >= this.config.institutionalThreshold) {
        const bodySize = this.calculateBodySize(candles[i]);
        const wickAnalysis = this.analyzeWicks(candles[i]);

        institutionalSignals.push({
          index: i,
          volume,
          ratio,
          bodySize,
          wickAnalysis,
          type: this.classifyInstitutionalActivity(bodySize, wickAnalysis, ratio),
          timestamp: candles[i].timestamp || Date.now()
        });
      }
    }

    return {
      detected: institutionalSignals.length > 0,
      signals: institutionalSignals,
      count: institutionalSignals.length,
      avgRatio: institutionalSignals.length > 0 
        ? institutionalSignals.reduce((sum, s) => sum + s.ratio, 0) / institutionalSignals.length 
        : 0
    };
  }

  buildVolumeProfile(candles) {
    const priceRanges = {};
    let totalVolume = 0;

    // Create price bins and accumulate volume
    for (const candle of candles) {
      const price = parseFloat(candle.close);
      const volume = parseFloat(candle.volume);
      const priceLevel = Math.round(price * 100) / 100; // Round to 2 decimals

      if (!priceRanges[priceLevel]) {
        priceRanges[priceLevel] = 0;
      }

      priceRanges[priceLevel] += volume;
      totalVolume += volume;
    }

    // Find volume peaks
    const sortedLevels = Object.entries(priceRanges)
      .map(([price, volume]) => ({
        price: parseFloat(price),
        volume,
        percentage: (volume / totalVolume) * 100
      }))
      .sort((a, b) => b.volume - a.volume);

    return {
      totalVolume,
      priceRanges,
      volumePeaks: sortedLevels.slice(0, 5), // Top 5 volume levels
      pointOfControl: sortedLevels[0] || null // Highest volume price level
    };
  }

  calculateVolumeConfidence(volumeSpikes, orderBlocks, breakoutSignals, institutionalActivity, volumeTrend) {
    let confidence = 0.5; // Base confidence

    // Volume spikes add confidence
    if (volumeSpikes.length > 0) {
      const avgSpikeRatio = volumeSpikes.reduce((sum, spike) => sum + spike.ratio, 0) / volumeSpikes.length;
      confidence += Math.min(0.2, (avgSpikeRatio - 2) * 0.1);
    }

    // Order blocks add significant confidence
    if (orderBlocks.length > 0) {
      confidence += 0.25;
      const strongBlocks = orderBlocks.filter(block => block.strength > 0.7).length;
      confidence += strongBlocks * 0.05;
    }

    // Breakout confirmation
    if (breakoutSignals.breakoutDetected) {
      confidence += 0.2;
    }

    // Institutional activity
    if (institutionalActivity.detected) {
      confidence += 0.15;
    }

    // Volume trend
    if (Math.abs(volumeTrend) > 0.3) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  // Helper methods
  calculateSpikeSignificance(ratio) {
    if (ratio >= 5) return 'VERY_HIGH';
    if (ratio >= 3) return 'HIGH';
    if (ratio >= 2) return 'MEDIUM';
    return 'LOW';
  }

  analyzePriceAction(candles, index) {
    const candle = candles[index];
    const open = parseFloat(candle.open);
    const close = parseFloat(candle.close);
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);

    const bodySize = Math.abs(close - open) / (high - low);
    const direction = close > open ? 'BULLISH' : 'BEARISH';
    const strength = bodySize;

    return { direction, strength, bodySize };
  }

  isOrderBlockPattern(priceAction, volumeRatio) {
    return priceAction.strength > 0.6 && volumeRatio >= this.config.orderBlockMinVolume;
  }

  calculateOrderBlockStrength(volumeRatio, priceAction) {
    const volumeComponent = Math.min(1, volumeRatio / 3);
    const priceComponent = priceAction.strength;
    return (volumeComponent * 0.6 + priceComponent * 0.4);
  }

  detectPriceBreakout(candles) {
    if (candles.length < 10) return { detected: false };

    const recent = candles.slice(-10);
    const current = candles[candles.length - 1];
    const highs = recent.map(c => parseFloat(c.high));
    const lows = recent.map(c => parseFloat(c.low));

    const resistance = Math.max(...highs.slice(0, -1));
    const support = Math.min(...lows.slice(0, -1));
    const currentHigh = parseFloat(current.high);
    const currentLow = parseFloat(current.low);

    let detected = false;
    let direction = null;
    let priceChange = 0;

    if (currentHigh > resistance) {
      detected = true;
      direction = 'BULLISH';
      priceChange = (currentHigh - resistance) / resistance;
    } else if (currentLow < support) {
      detected = true;
      direction = 'BEARISH';
      priceChange = (support - currentLow) / support;
    }

    return { detected, direction, priceChange };
  }

  calculateBreakoutConfidence(volumeRatio, priceBreakout) {
    let confidence = 0.5;

    if (priceBreakout.detected) {
      confidence += 0.3;
      confidence += Math.min(0.2, priceBreakout.priceChange * 10);
    }

    if (volumeRatio >= this.config.breakoutVolumeRatio) {
      confidence += 0.2;
      confidence += Math.min(0.1, (volumeRatio - this.config.breakoutVolumeRatio) * 0.05);
    }

    return Math.min(1, confidence);
  }

  calculateBodySize(candle) {
    const open = parseFloat(candle.open);
    const close = parseFloat(candle.close);
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);
    const range = high - low;

    return range > 0 ? Math.abs(close - open) / range : 0;
  }

  analyzeWicks(candle) {
    const open = parseFloat(candle.open);
    const close = parseFloat(candle.close);
    const high = parseFloat(candle.high);
    const low = parseFloat(candle.low);
    const range = high - low;

    if (range === 0) return { upper: 0, lower: 0, ratio: 0 };

    const bodyTop = Math.max(open, close);
    const bodyBottom = Math.min(open, close);
    const upperWick = high - bodyTop;
    const lowerWick = bodyBottom - low;
    const ratio = (upperWick + lowerWick) / range;

    return { upper: upperWick, lower: lowerWick, ratio };
  }

  classifyInstitutionalActivity(bodySize, wickAnalysis, volumeRatio) {
    if (bodySize > 0.7 && volumeRatio > 4) {
      return 'INSTITUTIONAL_BREAKOUT';
    } else if (wickAnalysis.ratio > 0.6 && volumeRatio > 3) {
      return 'INSTITUTIONAL_REJECTION';
    } else if (volumeRatio > 5) {
      return 'INSTITUTIONAL_ACCUMULATION';
    }
    return 'INSTITUTIONAL_ACTIVITY';
  }

  getEmptyAnalysis() {
    return {
      timeframe: 'M15',
      avgVolume: 0,
      currentVolume: 0,
      volumeTrend: 0,
      volumeSpikes: [],
      orderBlocks: [],
      breakoutSignals: { breakoutDetected: false, confidence: 0 },
      institutionalActivity: { detected: false, signals: [], count: 0, avgRatio: 0 },
      volumeProfile: { totalVolume: 0, priceRanges: {}, volumePeaks: [], pointOfControl: null },
      confidence: 0,
      hasOrderBlocks: false,
      hasVolumeSpike: false,
      hasBreakout: false,
      hasInstitutional: false,
      timestamp: Date.now()
    };
  }
}
