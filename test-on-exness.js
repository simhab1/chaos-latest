// Test script to run directly in Exness browser console
// Copy and paste this into the browser console on an Exness trading page

(async function testExnessDataCapture() {
  console.log('🧪 Testing Exness Data Capture...');
  
  // Test 1: Basic element detection
  console.log('\n📍 Test 1: Checking for common trading elements...');
  
  const commonSelectors = {
    prices: ['.price', '.quote', '.rate', '[class*="price"]', '[class*="quote"]'],
    symbols: ['.symbol', '.instrument', '.pair', '[class*="symbol"]', '[class*="instrument"]'],
    balance: ['.balance', '.account', '.wallet', '[class*="balance"]', '[class*="account"]'],
    buttons: ['button', '.btn', '[class*="buy"]', '[class*="sell"]']
  };
  
  for (const [category, selectors] of Object.entries(commonSelectors)) {
    console.log(`\n${category.toUpperCase()}:`);
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        console.log(`✅ Found ${elements.length} elements with selector: ${selector}`);
        // Show first few elements' content
        Array.from(elements).slice(0, 3).forEach((el, i) => {
          const text = el.textContent?.trim().substring(0, 50);
          if (text) {
            console.log(`   [${i}] "${text}"`);
          }
        });
      }
    }
  }
  
  // Test 2: Look for price-like numbers
  console.log('\n📍 Test 2: Searching for price-like numbers...');
  const priceRegex = /\d+\.\d{2,5}/g;
  const bodyText = document.body.textContent;
  const priceMatches = bodyText.match(priceRegex);
  
  if (priceMatches) {
    console.log(`✅ Found ${priceMatches.length} price-like numbers:`);
    const uniquePrices = [...new Set(priceMatches)].slice(0, 10);
    console.log(uniquePrices.join(', '));
  } else {
    console.log('❌ No price-like numbers found');
  }
  
  // Test 3: Check for trading platform indicators
  console.log('\n📍 Test 3: Platform detection...');
  const platformIndicators = {
    'MT4': ['.mt4', '[class*="mt4"]', '[data-platform="mt4"]'],
    'MT5': ['.mt5', '[class*="mt5"]', '[data-platform="mt5"]'],
    'WebTerminal': ['.web-terminal', '[class*="terminal"]'],
    'TradingView': ['.tradingview', '[class*="tradingview"]'],
    'Exness': ['.exness', '[class*="exness"]']
  };
  
  for (const [platform, selectors] of Object.entries(platformIndicators)) {
    for (const selector of selectors) {
      if (document.querySelector(selector)) {
        console.log(`✅ Detected platform: ${platform} (${selector})`);
        break;
      }
    }
  }
  
  // Test 4: Check page structure
  console.log('\n📍 Test 4: Page structure analysis...');
  console.log(`URL: ${window.location.href}`);
  console.log(`Title: ${document.title}`);
  console.log(`Total DOM elements: ${document.querySelectorAll('*').length}`);
  console.log(`Scripts: ${document.querySelectorAll('script').length}`);
  console.log(`Iframes: ${document.querySelectorAll('iframe').length}`);
  
  // Test 5: Check for dynamic content loading
  console.log('\n📍 Test 5: Monitoring for dynamic content...');
  let changeCount = 0;
  const observer = new MutationObserver((mutations) => {
    changeCount += mutations.length;
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true
  });
  
  setTimeout(() => {
    observer.disconnect();
    console.log(`✅ Detected ${changeCount} DOM changes in 5 seconds`);
    if (changeCount > 50) {
      console.log('⚠️  High DOM activity - content is very dynamic');
    }
  }, 5000);
  
  // Test 6: Try to find specific trading data
  console.log('\n📍 Test 6: Looking for specific trading data...');
  
  const tradingDataTests = [
    {
      name: 'Currency Pairs',
      regex: /[A-Z]{3}\/[A-Z]{3}|[A-Z]{6}/g,
      description: 'Looking for forex pairs like EUR/USD or EURUSD'
    },
    {
      name: 'Decimal Prices',
      regex: /\d+\.\d{4,5}/g,
      description: 'Looking for forex-style prices with 4-5 decimals'
    },
    {
      name: 'Account Numbers',
      regex: /\$[\d,]+\.?\d*/g,
      description: 'Looking for dollar amounts'
    },
    {
      name: 'Percentages',
      regex: /\d+\.?\d*%/g,
      description: 'Looking for percentage values'
    }
  ];
  
  tradingDataTests.forEach(test => {
    const matches = bodyText.match(test.regex);
    if (matches) {
      const unique = [...new Set(matches)].slice(0, 5);
      console.log(`✅ ${test.name}: ${unique.join(', ')}`);
    } else {
      console.log(`❌ ${test.name}: None found`);
    }
  });
  
  console.log('\n🏁 Test Complete! Check the results above to see what data is available.');
  console.log('💡 Tip: If you see lots of ✅ marks, the enhanced scraper should work well!');
  
})();