/**
 * ApexTrader India - Level 2 Order Book Depth Component (NSE/BSE)
 * Simulates active bid/ask market depth in Indian Rupees (₹),
 * calculates spreads, renders depth bars, and allows pre-filling limit orders.
 */

class OrderBook {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.symbol = 'RELIANCE';
    this.currentPrice = 2985.40;
    this.depthLevels = 7;
    this.asks = [];
    this.bids = [];

    this.renderSkeleton();
    this.updateData(this.currentPrice);
  }

  setSymbol(symbol, price) {
    this.symbol = symbol;
    this.currentPrice = price;
    this.updateData(price);
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="order-book-header">
        <span>Qty</span>
        <span class="text-center">Price (₹)</span>
        <span class="text-right">Total</span>
      </div>
      <div class="order-book-asks" id="ob-asks"></div>
      <div class="order-book-spread" id="ob-spread">
        <div class="spread-price" id="ob-mid-price">₹2,985.40</div>
        <div class="spread-info">
          <span>Spread</span>
          <span class="spread-val" id="ob-spread-val">₹0.10 (0.01%)</span>
        </div>
      </div>
      <div class="order-book-bids" id="ob-bids"></div>
    `;

    this.asksEl = document.getElementById('ob-asks');
    this.bidsEl = document.getElementById('ob-bids');
    this.midPriceEl = document.getElementById('ob-mid-price');
    this.spreadValEl = document.getElementById('ob-spread-val');
  }

  updateData(price) {
    this.currentPrice = price;
    // Standard NSE tick size of ₹0.05
    const tickSize = 0.05;
    const spreadMultiplier = price > 3000 ? 4 : 2;
    const spread = tickSize * spreadMultiplier;

    this.asks = [];
    let cumAsk = 0;
    for (let i = 0; i < this.depthLevels; i++) {
      const askPrice = Number((price + spread * (i + 1)).toFixed(2));
      const size = Math.round((120 + Math.random() * 950));
      cumAsk += size;
      this.asks.push({ price: askPrice, size, total: cumAsk });
    }

    this.bids = [];
    let cumBid = 0;
    for (let i = 0; i < this.depthLevels; i++) {
      const bidPrice = Number((price - spread * (i + 1)).toFixed(2));
      const size = Math.round((140 + Math.random() * 1100));
      cumBid += size;
      this.bids.push({ price: bidPrice, size, total: cumBid });
    }

    this.render();
  }

  render() {
    if (!this.asksEl || !this.bidsEl) return;

    const maxAskTotal = this.asks[this.asks.length - 1]?.total || 1;
    const maxBidTotal = this.bids[this.bids.length - 1]?.total || 1;
    const overallMax = Math.max(maxAskTotal, maxBidTotal);

    const reversedAsks = [...this.asks].reverse();

    this.asksEl.innerHTML = reversedAsks.map(item => {
      const depthPct = Math.min(100, Math.round((item.total / overallMax) * 100));
      return `
        <div class="ob-row ask-row" data-price="${item.price}" title="Click to fill limit price">
          <div class="depth-bar ask-bar" style="width: ${depthPct}%;"></div>
          <span class="ob-size">${item.size.toLocaleString('en-IN')}</span>
          <span class="ob-price text-center">${item.price.toFixed(2)}</span>
          <span class="ob-total text-right">${item.total.toLocaleString('en-IN')}</span>
        </div>
      `;
    }).join('');

    this.bidsEl.innerHTML = this.bids.map(item => {
      const depthPct = Math.min(100, Math.round((item.total / overallMax) * 100));
      return `
        <div class="ob-row bid-row" data-price="${item.price}" title="Click to fill limit price">
          <div class="depth-bar bid-bar" style="width: ${depthPct}%;"></div>
          <span class="ob-size">${item.size.toLocaleString('en-IN')}</span>
          <span class="ob-price text-center">${item.price.toFixed(2)}</span>
          <span class="ob-total text-right">${item.total.toLocaleString('en-IN')}</span>
        </div>
      `;
    }).join('');

    const bestAsk = this.asks[0]?.price || this.currentPrice;
    const bestBid = this.bids[0]?.price || this.currentPrice;
    const spreadDiff = Math.abs(bestAsk - bestBid);
    const spreadPct = ((spreadDiff / this.currentPrice) * 100).toFixed(2);

    this.midPriceEl.textContent = `₹${this.currentPrice.toFixed(2)}`;
    this.spreadValEl.textContent = `₹${spreadDiff.toFixed(2)} (${spreadPct}%)`;

    this.container.querySelectorAll('.ob-row').forEach(row => {
      row.addEventListener('click', () => {
        const p = row.getAttribute('data-price');
        if (p) {
          const ev = new CustomEvent('orderbook-price-selected', { detail: { price: Number(p) } });
          window.dispatchEvent(ev);
        }
      });
    });
  }
}

window.OrderBook = OrderBook;
