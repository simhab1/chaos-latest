export class SentimentAnalysis {
  constructor() {
    this.EXTREME_SENTIMENT_THRESHOLD = 75;
    this.SENTIMENT_SOURCES = {
      news: 0.4,
      social: 0.3,
      technical: 0.2,
      economic: 0.1
    };
    this.lastUpdate = null;
    this.sentimentCache = new Map();
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Analyze sentiment from multiple sources - FILTER ONLY
   * Returns recommendation to allow or filter out trades
   */
  async analyzeSentiment(symbol, timeframe = 'M15') {
    try {
      // Check cache first
      const cacheKey = `${symbol}_${timeframe}`;
      const cached = this.sentimentCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.updateInterval) {
        return cached.data;
      }

      // Gather sentiment from multiple sources
      const sentimentData = await this.gatherSentimentData(symbol);
      
      // Calculate composite sentiment
      const compositeSentiment = this.calculateCompositeSentiment(sentimentData);
      
      // Determine filter recommendation
      const filterRecommendation = this.generateFilterRecommendation(compositeSentiment);
      
      const result = {
        symbol,
        timeframe,
        sentiment: compositeSentiment.overall,
        score: compositeSentiment.score,
        sources: sentimentData,
        extremeLevel: compositeSentiment.extremeLevel,
        recommendation: filterRecommendation.action,
        strength: compositeSentiment.confidence,
        confidence: compositeSentiment.confidence,
        reason: filterRecommendation.reason,
        timestamp: new Date()
      };

      // Cache result
      this.sentimentCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
      
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      return this.getDefaultSentiment(symbol, timeframe);
    }
  }

  async gatherSentimentData(symbol) {
    // Simulate gathering sentiment from multiple sources
    const sources = {
      news: await this.getNewsSentiment(symbol),
      social: await this.getSocialSentiment(symbol),
      technical: await this.getTechnicalSentiment(symbol),
      economic: await this.getEconomicSentiment(symbol)
    };

    return sources;
  }

  async getNewsSentiment(symbol) {
    // Simulate news sentiment analysis
    const newsItems = this.simulateNewsData(symbol);
    const sentiment = this.analyzeNewsItems(newsItems);
    
    return {
      sentiment: sentiment.overall,
      score: sentiment.score,
      confidence: sentiment.confidence,
      articles: newsItems.length,
      lastUpdate: new Date(),
      source: 'news'
    };
  }

  async getSocialSentiment(symbol) {
    // Simulate social media sentiment
    const socialData = this.simulateSocialData(symbol);
    const sentiment = this.analyzeSocialData(socialData);
    
    return {
      sentiment: sentiment.overall,
      score: sentiment.score,
      confidence: sentiment.confidence,
      mentions: socialData.mentions,
      engagement: socialData.engagement,
      lastUpdate: new Date(),
      source: 'social'
    };
  }

  async getTechnicalSentiment(symbol) {
    // Simulate technical sentiment from other traders/signals
    const technicalData = this.simulateTechnicalData(symbol);
    const sentiment = this.analyzeTechnicalData(technicalData);
    
    return {
      sentiment: sentiment.overall,
      score: sentiment.score,
      confidence: sentiment.confidence,
      signals: technicalData.signals,
      accuracy: technicalData.accuracy,
      lastUpdate: new Date(),
      source: 'technical'
    };
  }

  async getEconomicSentiment(symbol) {
    // Simulate economic calendar sentiment
    const economicData = this.simulateEconomicData(symbol);
    const sentiment = this.analyzeEconomicData(economicData);
    
    return {
      sentiment: sentiment.overall,
      score: sentiment.score,
      confidence: sentiment.confidence,
      events: economicData.events,
      impact: economicData.impact,
      lastUpdate: new Date(),
      source: 'economic'
    };
  }

  calculateCompositeSentiment(sources) {
    let weightedScore = 0;
    let totalWeight = 0;
    let totalConfidence = 0;

    // Calculate weighted sentiment score
    for (const [source, weight] of Object.entries(this.SENTIMENT_SOURCES)) {
      if (sources[source] && sources[source].score !== undefined) {
        const sourceScore = sources[source].score;
        const sourceConfidence = sources[source].confidence || 0.5;
        
        weightedScore += sourceScore * weight * sourceConfidence;
        totalWeight += weight * sourceConfidence;
        totalConfidence += sourceConfidence;
      }
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
    const avgConfidence = totalConfidence / Object.keys(sources).length;

    // Determine overall sentiment
    let overall = 'NEUTRAL';
    if (finalScore > 15) overall = 'BULLISH';
    else if (finalScore < -15) overall = 'BEARISH';

    // Determine extreme level
    const extremeLevel = Math.abs(finalScore) > this.EXTREME_SENTIMENT_THRESHOLD ? 'HIGH' : 'LOW';

    return {
      overall,
      score: finalScore,
      confidence: avgConfidence,
      extremeLevel
    };
  }

  generateFilterRecommendation(sentiment) {
    // CRITICAL: Sentiment is FILTER ONLY, never a trading trigger
    
    // Filter out trades during extreme sentiment (contrarian approach)
    if (sentiment.extremeLevel === 'HIGH') {
      return {
        action: 'FILTER_OUT',
        reason: 'Extreme sentiment detected - high risk of reversal',
        details: `Sentiment score: ${sentiment.score.toFixed(1)}, Level: ${sentiment.extremeLevel}`
      };
    }

    // Filter out trades with very low confidence
    if (sentiment.confidence < 0.3) {
      return {
        action: 'FILTER_OUT',
        reason: 'Low sentiment confidence - unreliable signal',
        details: `Confidence: ${(sentiment.confidence * 100).toFixed(1)}%`
      };
    }

    // Allow trades with moderate sentiment
    return {
      action: 'ALLOW',
      reason: 'Sentiment within normal range',
      details: `Score: ${sentiment.score.toFixed(1)}, Confidence: ${(sentiment.confidence * 100).toFixed(1)}%`
    };
  }

  // Simulation methods for realistic sentiment data
  simulateNewsData(symbol) {
    const headlines = [
      `${symbol} shows strong momentum in latest trading session`,
      `Technical analysis suggests ${symbol} may face resistance`,
      `Market volatility impacts ${symbol} trading patterns`,
      `Economic indicators favor ${symbol} outlook`,
      `${symbol} breaks key support level amid market uncertainty`,
      `Institutional investors increase ${symbol} positions`,
      `Central bank decisions could affect ${symbol} direction`,
      `Geopolitical tensions create uncertainty for ${symbol}`,
      `Strong earnings reports boost ${symbol} sentiment`,
      `Regulatory changes may impact ${symbol} trading`
    ];

    return headlines.slice(0, Math.floor(Math.random() * 5) + 3).map(headline => ({
      headline,
      sentiment: this.analyzeHeadline(headline),
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      source: 'financial_news'
    }));
  }

  simulateSocialData(symbol) {
    return {
      mentions: Math.floor(Math.random() * 1000) + 100,
      engagement: Math.random() * 100,
      sentiment: (Math.random() - 0.5) * 100,
      trending: Math.random() > 0.7,
      positiveRatio: Math.random(),
      influencerMentions: Math.floor(Math.random() * 10)
    };
  }

  simulateTechnicalData(symbol) {
    return {
      signals: Math.floor(Math.random() * 50) + 10,
      accuracy: Math.random() * 40 + 60, // 60-100%
      sentiment: (Math.random() - 0.5) * 80,
      bullishSignals: Math.floor(Math.random() * 25),
      bearishSignals: Math.floor(Math.random() * 25)
    };
  }

  simulateEconomicData(symbol) {
    const impacts = ['LOW', 'MEDIUM', 'HIGH'];
    return {
      events: Math.floor(Math.random() * 5) + 1,
      impact: impacts[Math.floor(Math.random() * 3)],
      sentiment: (Math.random() - 0.5) * 60,
      releaseTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      currency: symbol.includes('USD') ? 'USD' : 'OTHER'
    };
  }

  analyzeNewsItems(newsItems) {
    let totalSentiment = 0;
    let validItems = 0;

    for (const item of newsItems) {
      if (item.sentiment !== null) {
        totalSentiment += item.sentiment;
        validItems++;
      }
    }

    const avgSentiment = validItems > 0 ? totalSentiment / validItems : 0;
    const confidence = Math.min(validItems / 10, 1);

    return {
      overall: avgSentiment > 10 ? 'BULLISH' : avgSentiment < -10 ? 'BEARISH' : 'NEUTRAL',
      score: avgSentiment,
      confidence
    };
  }

  analyzeSocialData(socialData) {
    const score = socialData.sentiment * (socialData.engagement / 100);
    const confidence = Math.min(socialData.mentions / 500, 1);

    return {
      overall: score > 15 ? 'BULLISH' : score < -15 ? 'BEARISH' : 'NEUTRAL',
      score,
      confidence
    };
  }

  analyzeTechnicalData(technicalData) {
    const score = technicalData.sentiment * (technicalData.accuracy / 100);
    const confidence = Math.min(technicalData.signals / 30, 1);

    return {
      overall: score > 20 ? 'BULLISH' : score < -20 ? 'BEARISH' : 'NEUTRAL',
      score,
      confidence
    };
  }

  analyzeEconomicData(economicData) {
    const impactMultiplier = { LOW: 0.5, MEDIUM: 1.0, HIGH: 1.5 }[economicData.impact] || 1.0;
    const score = economicData.sentiment * impactMultiplier;
    const confidence = Math.min(economicData.events / 3, 1);

    return {
      overall: score > 25 ? 'BULLISH' : score < -25 ? 'BEARISH' : 'NEUTRAL',
      score,
      confidence
    };
  }

  analyzeHeadline(headline) {
    const bullishWords = ['strong', 'momentum', 'bullish', 'surge', 'rally', 'gains', 'positive', 'up', 'boost', 'increase'];
    const bearishWords = ['weak', 'decline', 'bearish', 'fall', 'crash', 'negative', 'down', 'resistance', 'uncertainty', 'drop'];

    const text = headline.toLowerCase();
    let sentiment = 0;

    for (const word of bullishWords) {
      if (text.includes(word)) sentiment += 20;
    }

    for (const word of bearishWords) {
      if (text.includes(word)) sentiment -= 20;
    }

    return Math.max(-100, Math.min(100, sentiment));
  }

  getDefaultSentiment(symbol, timeframe) {
    return {
      symbol,
      timeframe,
      sentiment: 'NEUTRAL',
      score: 0,
      sources: {
        news: { sentiment: 'NEUTRAL', score: 0, confidence: 0.5 },
        social: { sentiment: 'NEUTRAL', score: 0, confidence: 0.5 },
        technical: { sentiment: 'NEUTRAL', score: 0, confidence: 0.5 },
        economic: { sentiment: 'NEUTRAL', score: 0, confidence: 0.5 }
      },
      extremeLevel: 'LOW',
      recommendation: 'ALLOW',
      strength: 0.5,
      confidence: 0.5,
      reason: 'Default sentiment - no data available',
      timestamp: new Date()
    };
  }
}
