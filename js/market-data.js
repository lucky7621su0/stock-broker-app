/**
 * ApexTrader India - Market Data Simulation Engine (NSE & BSE)
 * Provides real-time market data, tick-by-tick streamer, and historical OHLCV
 * candlestick generation for India's premier Nifty 50 and blue-chip equities.
 */

const STOCKS_DATABASE = {
  RELIANCE: { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy & Telecom', price: 2985.40, prevClose: 2954.10, volatility: 0.015, volume: '8.4M', marketCap: '₹20.2L Cr', high52: 3217.90, low52: 2221.05, badge: 'Nifty Heavyweight' },
  TCS: { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT Services', price: 4480.00, prevClose: 4432.50, volatility: 0.012, volume: '2.8M', marketCap: '₹16.2L Cr', high52: 4592.25, low52: 3313.00, badge: 'IT Leader' },
  HDFCBANK: { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', sector: 'Banking', price: 1665.20, prevClose: 1652.80, volatility: 0.014, volume: '14.2M', marketCap: '₹12.7L Cr', high52: 1794.00, low52: 1363.45, badge: 'Private Bank #1' },
  INFY: { symbol: 'INFY', name: 'Infosys Limited', exchange: 'NSE', sector: 'IT Services', price: 1940.50, prevClose: 1918.00, volatility: 0.016, volume: '6.1M', marketCap: '₹8.05L Cr', high52: 1978.00, low52: 1358.35, badge: 'Tech Bluechip' },
  ICICIBANK: { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', sector: 'Banking', price: 1220.80, prevClose: 1210.30, volatility: 0.015, volume: '11.5M', marketCap: '₹8.58L Cr', high52: 1257.80, low52: 914.00, badge: 'High Momentum' },
  TATAMOTORS: { symbol: 'TATAMOTORS', name: 'Tata Motors Limited', exchange: 'NSE', sector: 'Automotive & EV', price: 1035.00, prevClose: 1018.40, volatility: 0.024, volume: '12.8M', marketCap: '₹3.82L Cr', high52: 1179.05, low52: 608.00, badge: 'EV Pioneer' },
  BHARTIARTL: { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', sector: 'Telecom', price: 1560.00, prevClose: 1542.20, volatility: 0.014, volume: '5.6M', marketCap: '₹9.30L Cr', high52: 1598.00, low52: 885.00, badge: '5G Growth' },
  ITC: { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE', sector: 'FMCG & Diversified', price: 505.30, prevClose: 502.10, volatility: 0.010, volume: '16.4M', marketCap: '₹6.31L Cr', high52: 514.40, low52: 399.30, badge: 'FMCG Major' },
  SBIN: { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', sector: 'PSU Banking', price: 815.40, prevClose: 808.90, volatility: 0.018, volume: '18.9M', marketCap: '₹7.28L Cr', high52: 912.10, low52: 555.25, badge: 'Largest PSU' },
  LT: { symbol: 'LT', name: 'Larsen & Toubro Ltd', exchange: 'NSE', sector: 'Infrastructure', price: 3680.00, prevClose: 3645.00, volatility: 0.016, volume: '2.1M', marketCap: '₹5.06L Cr', high52: 3919.90, low52: 2853.60, badge: 'Capex Giant' },
  SUNPHARMA: { symbol: 'SUNPHARMA', name: 'Sun Pharma Industries', exchange: 'NSE', sector: 'Healthcare & Pharma', price: 1870.00, prevClose: 1855.00, volatility: 0.013, volume: '3.4M', marketCap: '₹4.48L Cr', high52: 1915.00, low52: 1110.00, badge: 'Pharma Leader' },
  BAJFINANCE: { symbol: 'BAJFINANCE', name: 'Bajaj Finance Limited', exchange: 'NSE', sector: 'NBFC & Fintech', price: 7250.00, prevClose: 7180.00, volatility: 0.022, volume: '1.4M', marketCap: '₹4.49L Cr', high52: 7824.00, low52: 6160.00, badge: 'Fintech Titan' },
  TATASTEEL: { symbol: 'TATASTEEL', name: 'Tata Steel Limited', exchange: 'NSE', sector: 'Metals & Mining', price: 152.40, prevClose: 150.10, volatility: 0.026, volume: '38.5M', marketCap: '₹1.90L Cr', high52: 184.60, low52: 118.25, badge: 'Commodity' },
  ZOMATO: { symbol: 'ZOMATO', name: 'Zomato Limited', exchange: 'NSE', sector: 'Consumer Tech', price: 275.50, prevClose: 268.00, volatility: 0.032, volume: '42.0M', marketCap: '₹2.42L Cr', high52: 298.20, low52: 98.40, badge: 'Quick Commerce' }
};

const INDIAN_INDICES = [
  { symbol: 'NIFTY 50', value: 25356.50, change: '+0.45%', positive: true },
  { symbol: 'BANK NIFTY', value: 51890.20, change: '+0.62%', positive: true },
  { symbol: 'SENSEX', value: 82890.90, change: '+0.38%', positive: true },
  { symbol: 'NIFTY IT', value: 42120.00, change: '+1.10%', positive: true },
  { symbol: 'FINNIFTY', value: 23850.40, change: '+0.55%', positive: true },
  { symbol: 'INDIA VIX', value: 13.20, change: '-2.40%', positive: true }
];

class MarketDataEngine {
  constructor() {
    this.stocks = JSON.parse(JSON.stringify(STOCKS_DATABASE));
    this.subscribers = new Set();
    this.stockSubscribers = new Map();
    this.candleHistory = new Map();
    this.timer = null;
    this.indices = [...INDIAN_INDICES];

    // Initialize day stats for NSE stocks
    Object.keys(this.stocks).forEach(sym => {
      const s = this.stocks[sym];
      s.dayOpen = s.prevClose * (1 + (Math.random() - 0.48) * 0.012);
      s.dayHigh = Math.max(s.price, s.dayOpen * 1.01);
      s.dayLow = Math.min(s.price, s.dayOpen * 0.99);
      s.change = s.price - s.prevClose;
      s.changePct = (s.change / s.prevClose) * 100;
      s.sparkline = this.generateSparkline(s.price, s.volatility);
    });

    this.startStreaming();
  }

  generateSparkline(basePrice, vol) {
    const points = [basePrice * (1 - vol * 1.5)];
    for (let i = 1; i < 20; i++) {
      const step = (Math.random() - 0.48) * vol * basePrice * 0.5;
      points.push(Math.max(1, points[i - 1] + step));
    }
    points.push(basePrice);
    return points;
  }

  // Generate realistic OHLCV candlestick series for Indian equities
  generateCandles(symbol, timeframe = '1D') {
    const cacheKey = `${symbol}_${timeframe}`;
    if (this.candleHistory.has(cacheKey)) {
      return this.candleHistory.get(cacheKey);
    }

    const stock = this.stocks[symbol] || STOCKS_DATABASE[symbol] || STOCKS_DATABASE['RELIANCE'];
    const currentPrice = stock.price;
    const vol = stock.volatility;

    let candleCount = 80;
    let intervalMs = 5 * 60 * 1000;

    switch (timeframe) {
      case '1D':
        candleCount = 75; // 9:15 AM to 3:30 PM (375 minutes / 5m = 75 bars)
        intervalMs = 5 * 60 * 1000;
        break;
      case '1W':
        candleCount = 85;
        intervalMs = 30 * 60 * 1000;
        break;
      case '1M':
        candleCount = 90;
        intervalMs = 4 * 3600 * 1000;
        break;
      case '3M':
        candleCount = 65;
        intervalMs = 24 * 3600 * 1000;
        break;
      case '1Y':
        candleCount = 120;
        intervalMs = 3 * 24 * 3600 * 1000;
        break;
    }

    const now = Date.now();
    const candles = [];

    let walkPrice = currentPrice;
    const tempCloses = [currentPrice];
    for (let i = 0; i < candleCount; i++) {
      const delta = (Math.random() - 0.495) * vol * 0.8 * walkPrice;
      walkPrice = Math.max(1, walkPrice - delta);
      tempCloses.unshift(walkPrice);
    }

    for (let i = 0; i < candleCount; i++) {
      const open = tempCloses[i];
      const close = (i === candleCount - 1) ? currentPrice : tempCloses[i + 1];
      const spread = Math.abs(close - open);
      const candleVolMultiplier = vol * (0.8 + Math.random() * 0.6);

      const high = Math.max(open, close) + (Math.random() * spread * 0.8 + Math.random() * open * candleVolMultiplier * 0.35);
      const low = Math.min(open, close) - (Math.random() * spread * 0.8 + Math.random() * open * candleVolMultiplier * 0.35);

      const baseVolume = 18000;
      const volume = Math.round(baseVolume * (0.5 + Math.random() * 1.5) * (1 + spread / (open * 0.01)));
      const time = now - (candleCount - 1 - i) * intervalMs;

      candles.push({
        time,
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });
    }

    this.candleHistory.set(cacheKey, candles);
    return candles;
  }

  // Live tick streaming with NSE standard tick sizes (₹0.05)
  startStreaming() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      const symbols = Object.keys(this.stocks);
      const count = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const sym = symbols[Math.floor(Math.random() * symbols.length)];
        this.tickStock(sym);
      }

      // Slightly tick indices
      if (Math.random() > 0.55) {
        const idx = Math.floor(Math.random() * this.indices.length);
        const item = this.indices[idx];
        const drift = (Math.random() - 0.49) * 0.001 * item.value;
        item.value = Number((item.value + drift).toFixed(2));
      }

      this.notifySubscribers();
    }, 450);
  }

  tickStock(symbol) {
    const s = this.stocks[symbol];
    if (!s) return;

    const isShock = Math.random() < 0.035;
    const mult = isShock ? 2.2 : 0.55;
    let pctChange = (Math.random() - 0.492) * s.volatility * mult * 0.1;
    let delta = s.price * pctChange;

    // Align to NSE standard ₹0.05 tick size
    delta = Math.round(delta / 0.05) * 0.05;
    if (Math.abs(delta) < 0.05) {
      delta = Math.random() > 0.5 ? 0.05 : -0.05;
    }

    const oldPrice = s.price;
    s.price = Number(Math.max(1, s.price + delta).toFixed(2));
    s.lastTickDirection = s.price >= oldPrice ? 'up' : 'down';
    s.lastTickTime = Date.now();

    if (s.price > s.dayHigh) s.dayHigh = s.price;
    if (s.price < s.dayLow) s.dayLow = s.price;

    s.change = Number((s.price - s.prevClose).toFixed(2));
    s.changePct = Number(((s.change / s.prevClose) * 100).toFixed(2));

    for (const key of this.candleHistory.keys()) {
      if (key.startsWith(`${symbol}_`)) {
        const candles = this.candleHistory.get(key);
        if (candles && candles.length > 0) {
          const last = candles[candles.length - 1];
          last.close = s.price;
          if (s.price > last.high) last.high = s.price;
          if (s.price < last.low) last.low = s.price;
          last.volume += Math.round(50 + Math.random() * 200);
        }
      }
    }

    if (this.stockSubscribers.has(symbol)) {
      const callbacks = this.stockSubscribers.get(symbol);
      callbacks.forEach(cb => cb(s));
    }
  }

  getStock(symbol) {
    return this.stocks[symbol] || null;
  }

  getAllStocks() {
    return Object.values(this.stocks);
  }

  getIndices() {
    return this.indices;
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  subscribeStock(symbol, callback) {
    if (!this.stockSubscribers.has(symbol)) {
      this.stockSubscribers.set(symbol, new Set());
    }
    this.stockSubscribers.get(symbol).add(callback);
    return () => {
      if (this.stockSubscribers.has(symbol)) {
        this.stockSubscribers.get(symbol).delete(callback);
      }
    };
  }

  notifySubscribers() {
    this.subscribers.forEach(cb => cb(this.stocks));
  }
}

window.marketData = new MarketDataEngine();
