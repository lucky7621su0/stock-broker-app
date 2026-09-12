/**
 * ApexTrader India - Application Orchestrator
 * Connects Indian stock universe, NSE/BSE filter tabs, INR currency formatting,
 * chart controllers, terminal actions, and portfolio bottom dock.
 */

class AppOrchestrator {
  constructor() {
    this.activeSymbol = 'RELIANCE';
    this.orderSide = 'BUY';
    this.orderType = 'MARKET';
    this.watchlistFilter = 'ALL';
    this.watchlistSearchQuery = '';

    this.chart = null;
    this.orderBook = null;

    this.init();
  }

  init() {
    this.chart = new FinancialChart('chart-canvas-container');
    this.orderBook = new OrderBook('order-book-container');

    this.renderMarquee();
    this.renderWatchlist();
    this.updateStockHeader();

    this.bindChartControls();
    this.bindTerminalControls();
    this.bindBottomDockTabs();
    this.bindModals();
    this.bindToasts();

    window.marketData.subscribe(() => {
      this.onMarketTick();
    });

    window.marketData.subscribeStock(this.activeSymbol, (s) => {
      this.onActiveStockTick(s);
    });

    window.addEventListener('account-updated', () => {
      this.renderAccountStats();
      this.renderPositionsTable();
      this.renderPendingOrdersTable();
      this.renderHistoryTable();
      this.renderPortfolioBreakdown();
    });

    window.addEventListener('orderbook-price-selected', (e) => {
      this.setLimitPrice(e.detail.price);
    });

    window.addEventListener('chart-tooltip-update', (e) => {
      this.onChartTooltip(e.detail.candle);
    });

    this.renderAccountStats();
    this.renderPositionsTable();
    this.renderPendingOrdersTable();
    this.renderHistoryTable();
    this.renderPortfolioBreakdown();
    this.updateOrderSummary();
  }

  // --- Header Marquee ---
  renderMarquee() {
    const marqueeEl = document.getElementById('market-marquee');
    if (!marqueeEl) return;

    const indices = window.marketData.getIndices();
    marqueeEl.innerHTML = indices.map(idx => `
      <div class="marquee-item">
        <span class="marquee-sym">${idx.symbol}</span>
        <span class="marquee-val">${idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        <span class="marquee-chg ${idx.positive ? 'up' : 'down'}">${idx.change}</span>
      </div>
    `).join('');
  }

  updateMarqueeValues() {
    const indices = window.marketData.getIndices();
    const items = document.querySelectorAll('.marquee-item');
    indices.forEach((idx, i) => {
      if (items[i]) {
        const valEl = items[i].querySelector('.marquee-val');
        if (valEl) valEl.textContent = idx.value.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      }
    });
  }

  // --- Watchlist ---
  renderWatchlist() {
    const listEl = document.getElementById('watchlist-items');
    if (!listEl) return;

    let stocks = window.marketData.getAllStocks();

    if (this.watchlistSearchQuery) {
      const q = this.watchlistSearchQuery.toLowerCase();
      stocks = stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q));
    }

    if (this.watchlistFilter === 'BANKING') {
      stocks = stocks.filter(s => s.sector.includes('Banking') || s.sector.includes('NBFC'));
    } else if (this.watchlistFilter === 'IT') {
      stocks = stocks.filter(s => s.sector.includes('IT') || s.sector.includes('Tech'));
    } else if (this.watchlistFilter === 'AUTO') {
      stocks = stocks.filter(s => s.sector.includes('Auto'));
    } else if (this.watchlistFilter === 'GAINERS') {
      stocks = [...stocks].sort((a, b) => b.changePct - a.changePct);
    } else if (this.watchlistFilter === 'LOSERS') {
      stocks = [...stocks].sort((a, b) => a.changePct - b.changePct);
    }

    listEl.innerHTML = stocks.map(stock => {
      const isSelected = stock.symbol === this.activeSymbol;
      const isUp = stock.change >= 0;
      const colorClass = isUp ? 'text-up' : 'text-down';
      const chgPrefix = isUp ? '+' : '';
      const sparkSvg = this.generateSparklineSvg(stock.sparkline, isUp);

      return `
        <div class="watchlist-card ${isSelected ? 'active' : ''}" data-symbol="${stock.symbol}" id="wl-${stock.symbol}">
          <div class="wl-left">
            <div class="wl-symbol-row">
              <span class="wl-symbol">${stock.symbol}</span>
              <span class="wl-exchange-badge">${stock.exchange || 'NSE'}</span>
            </div>
            <span class="wl-name">${stock.name}</span>
          </div>

          <div class="wl-sparkline">
            ${sparkSvg}
          </div>

          <div class="wl-right">
            <span class="wl-price" id="wlp-${stock.symbol}">₹${stock.price.toFixed(2)}</span>
            <span class="wl-change ${colorClass}" id="wlc-${stock.symbol}">
              ${chgPrefix}${stock.change.toFixed(2)} (${chgPrefix}${stock.changePct.toFixed(2)}%)
            </span>
          </div>
        </div>
      `;
    }).join('');

    listEl.querySelectorAll('.watchlist-card').forEach(card => {
      card.addEventListener('click', () => {
        const sym = card.getAttribute('data-symbol');
        if (sym) this.switchStock(sym);
      });
    });
  }

  generateSparklineSvg(points, isUp) {
    if (!points || points.length < 2) return '';
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const w = 64;
    const h = 26;

    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const stroke = isUp ? '#00f59b' : '#ff3366';
    return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <polyline fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" points="${coords}" />
    </svg>`;
  }

  updateWatchlistPrices() {
    const stocks = window.marketData.getAllStocks();
    stocks.forEach(s => {
      const priceEl = document.getElementById(`wlp-${s.symbol}`);
      const chgEl = document.getElementById(`wlc-${s.symbol}`);
      const cardEl = document.getElementById(`wl-${s.symbol}`);

      if (priceEl && chgEl) {
        priceEl.textContent = `₹${s.price.toFixed(2)}`;
        const isUp = s.change >= 0;
        const pfx = isUp ? '+' : '';
        chgEl.textContent = `${pfx}${s.change.toFixed(2)} (${pfx}${s.changePct.toFixed(2)}%)`;
        chgEl.className = `wl-change ${isUp ? 'text-up' : 'text-down'}`;

        if (s.lastTickDirection && cardEl) {
          cardEl.classList.remove('tick-up', 'tick-down');
          void cardEl.offsetWidth;
          cardEl.classList.add(s.lastTickDirection === 'up' ? 'tick-up' : 'tick-down');
        }
      }
    });
  }

  // --- Switch Stock ---
  switchStock(symbol) {
    if (this.activeSymbol === symbol) return;

    this.activeSymbol = symbol;
    window.soundFx?.playTick();

    document.querySelectorAll('.watchlist-card').forEach(card => {
      card.classList.toggle('active', card.getAttribute('data-symbol') === symbol);
    });

    const stock = window.marketData.getStock(symbol);
    if (!stock) return;

    this.chart.setSymbol(symbol);
    this.orderBook.setSymbol(symbol, stock.price);
    this.updateStockHeader();

    const limitInput = document.getElementById('order-limit-price');
    if (limitInput) limitInput.value = stock.price.toFixed(2);

    const submitBtn = document.getElementById('order-submit-btn');
    if (submitBtn) {
      const action = this.orderSide === 'BUY' ? 'Buy' : 'Sell';
      submitBtn.textContent = `${action} ${this.activeSymbol} (NSE)`;
    }

    this.updateOrderSummary();
  }

  // --- Active Stock Header ---
  updateStockHeader() {
    const s = window.marketData.getStock(this.activeSymbol);
    if (!s) return;

    document.getElementById('stock-sym').textContent = s.symbol;
    document.getElementById('stock-name').textContent = s.name;
    document.getElementById('stock-sector-badge').textContent = `${s.exchange || 'NSE'} • ${s.sector}`;

    const priceEl = document.getElementById('stock-live-price');
    priceEl.textContent = `₹${s.price.toFixed(2)}`;

    const isUp = s.change >= 0;
    const pfx = isUp ? '+' : '';
    const chgEl = document.getElementById('stock-day-change');
    chgEl.textContent = `${pfx}₹${s.change.toFixed(2)} (${pfx}${s.changePct.toFixed(2)}%)`;
    chgEl.className = `header-change-badge ${isUp ? 'up' : 'down'}`;

    document.getElementById('stat-high').textContent = `₹${s.dayHigh.toFixed(2)}`;
    document.getElementById('stat-low').textContent = `₹${s.dayLow.toFixed(2)}`;
    document.getElementById('stat-volume').textContent = s.volume;
    document.getElementById('stat-cap').textContent = s.marketCap;
  }

  onActiveStockTick(s) {
    this.updateStockHeader();
    this.orderBook.updateData(s.price);
    this.chart.render();
    this.updateOrderSummary();
  }

  onMarketTick() {
    this.updateWatchlistPrices();
    this.updateMarqueeValues();
    this.renderAccountStats();
    this.renderPositionsTable();
  }

  // --- Chart Controls ---
  bindChartControls() {
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tf = btn.getAttribute('data-tf');
        this.chart.setTimeframe(tf);
        window.soundFx?.playTick();
      });
    });

    const btnCandles = document.getElementById('btn-type-candles');
    const btnArea = document.getElementById('btn-type-area');

    if (btnCandles && btnArea) {
      btnCandles.addEventListener('click', () => {
        btnCandles.classList.add('active');
        btnArea.classList.remove('active');
        this.chart.setChartType('candles');
        window.soundFx?.playTick();
      });

      btnArea.addEventListener('click', () => {
        btnArea.classList.add('active');
        btnCandles.classList.remove('active');
        this.chart.setChartType('area');
        window.soundFx?.playTick();
      });
    }

    document.querySelectorAll('.indicator-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.classList.toggle('active');
        const ind = btn.getAttribute('data-indicator');
        this.chart.toggleIndicator(ind);
        window.soundFx?.playTick();
      });
    });
  }

  onChartTooltip(candle) {
    const ohlcEl = document.getElementById('chart-ohlc-info');
    if (!ohlcEl) return;

    if (!candle) {
      const s = window.marketData.getStock(this.activeSymbol);
      if (s) {
        ohlcEl.innerHTML = `<span>LIVE: <b>₹${s.price.toFixed(2)}</b></span> <span>H: <b>₹${s.dayHigh.toFixed(2)}</b></span> <span>L: <b>₹${s.dayLow.toFixed(2)}</b></span>`;
      }
      return;
    }

    const isUp = candle.close >= candle.open;
    const chg = candle.close - candle.open;
    const chgPct = ((chg / candle.open) * 100).toFixed(2);
    const pfx = isUp ? '+' : '';

    ohlcEl.innerHTML = `
      <span>O: <b>₹${candle.open.toFixed(2)}</b></span>
      <span>H: <b>₹${candle.high.toFixed(2)}</b></span>
      <span>L: <b>₹${candle.low.toFixed(2)}</b></span>
      <span>C: <b class="${isUp ? 'text-up' : 'text-down'}">₹${candle.close.toFixed(2)}</b></span>
      <span>Chg: <b class="${isUp ? 'text-up' : 'text-down'}">${pfx}${chgPct}%</b></span>
      <span>Vol: <b>${candle.volume.toLocaleString('en-IN')}</b></span>
    `;
  }

  // --- Order Terminal Controls ---
  bindTerminalControls() {
    const btnBuy = document.getElementById('order-tab-buy');
    const btnSell = document.getElementById('order-tab-sell');
    const submitBtn = document.getElementById('order-submit-btn');
    const sharesInput = document.getElementById('order-shares-input');
    const limitPriceInput = document.getElementById('order-limit-price');
    const orderTypeSelect = document.getElementById('order-type-select');
    const limitPriceRow = document.getElementById('limit-price-row');

    btnBuy?.addEventListener('click', () => {
      this.orderSide = 'BUY';
      btnBuy.classList.add('active');
      btnSell?.classList.remove('active');
      if (submitBtn) {
        submitBtn.className = 'submit-order-btn buy-btn';
        submitBtn.textContent = `Buy ${this.activeSymbol} (NSE)`;
      }
      window.soundFx?.playTick();
      this.updateOrderSummary();
    });

    btnSell?.addEventListener('click', () => {
      this.orderSide = 'SELL';
      btnSell.classList.add('active');
      btnBuy?.classList.remove('active');
      if (submitBtn) {
        submitBtn.className = 'submit-order-btn sell-btn';
        submitBtn.textContent = `Sell ${this.activeSymbol} (NSE)`;
      }
      window.soundFx?.playTick();
      this.updateOrderSummary();
    });

    orderTypeSelect?.addEventListener('change', (e) => {
      this.orderType = e.target.value;
      if (this.orderType === 'MARKET') {
        limitPriceRow.style.display = 'none';
      } else {
        limitPriceRow.style.display = 'flex';
        const s = window.marketData.getStock(this.activeSymbol);
        if (s && limitPriceInput) {
          limitPriceInput.value = s.price.toFixed(2);
        }
      }
      this.updateOrderSummary();
    });

    document.getElementById('btn-qty-minus')?.addEventListener('click', () => {
      const val = Math.max(1, (parseInt(sharesInput.value, 10) || 1) - 1);
      sharesInput.value = val;
      this.updateOrderSummary();
    });

    document.getElementById('btn-qty-plus')?.addEventListener('click', () => {
      const val = (parseInt(sharesInput.value, 10) || 1) + 1;
      sharesInput.value = val;
      this.updateOrderSummary();
    });

    sharesInput?.addEventListener('input', () => {
      this.updateOrderSummary();
    });

    limitPriceInput?.addEventListener('input', () => {
      this.updateOrderSummary();
    });

    document.querySelectorAll('.pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseFloat(btn.getAttribute('data-pct')) / 100;
        const stock = window.marketData.getStock(this.activeSymbol);
        if (!stock) return;

        const p = (this.orderType === 'MARKET' ? stock.price : parseFloat(limitPriceInput.value)) || stock.price;

        if (this.orderSide === 'BUY') {
          const allocDollars = window.tradingTerminal.cash * pct;
          const maxShares = Math.floor(allocDollars / p);
          sharesInput.value = Math.max(1, maxShares);
        } else {
          const pos = window.tradingTerminal.positions[this.activeSymbol];
          if (pos && pos.shares > 0) {
            const sellShares = Math.max(1, Math.floor(pos.shares * pct));
            sharesInput.value = sellShares;
          } else {
            sharesInput.value = 1;
          }
        }
        window.soundFx?.playTick();
        this.updateOrderSummary();
      });
    });

    submitBtn?.addEventListener('click', () => {
      this.handleOrderSubmission();
    });

    const searchInput = document.getElementById('watchlist-search');
    searchInput?.addEventListener('input', (e) => {
      this.watchlistSearchQuery = e.target.value.trim();
      this.renderWatchlist();
    });

    document.querySelectorAll('.wl-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.wl-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.watchlistFilter = pill.getAttribute('data-filter');
        this.renderWatchlist();
        window.soundFx?.playTick();
      });
    });
  }

  setLimitPrice(price) {
    const select = document.getElementById('order-type-select');
    const limitRow = document.getElementById('limit-price-row');
    const limitInput = document.getElementById('order-limit-price');

    if (select && limitRow && limitInput) {
      select.value = 'LIMIT';
      this.orderType = 'LIMIT';
      limitRow.style.display = 'flex';
      limitInput.value = price.toFixed(2);
      this.updateOrderSummary();
      window.soundFx?.playTick();
    }
  }

  updateOrderSummary() {
    const stock = window.marketData.getStock(this.activeSymbol);
    if (!stock) return;

    const sharesInput = document.getElementById('order-shares-input');
    const limitPriceInput = document.getElementById('order-limit-price');
    const shares = Math.max(1, parseInt(sharesInput?.value, 10) || 1);

    const executionPrice = (this.orderType === 'MARKET') ? stock.price : (parseFloat(limitPriceInput?.value) || stock.price);
    const estTotal = shares * executionPrice;

    document.getElementById('summary-exec-price').textContent = `₹${executionPrice.toFixed(2)}`;
    document.getElementById('summary-est-total').textContent = window.formatINR(estTotal);
    document.getElementById('summary-buying-power').textContent = window.formatINR(window.tradingTerminal.cash);

    const heldPos = window.tradingTerminal.positions[this.activeSymbol];
    const sharesHeld = heldPos ? heldPos.shares : 0;
    const heldEl = document.getElementById('summary-shares-held');
    if (heldEl) {
      heldEl.textContent = `${sharesHeld} shares held`;
    }
  }

  handleOrderSubmission() {
    const sharesInput = document.getElementById('order-shares-input');
    const limitPriceInput = document.getElementById('order-limit-price');
    const shares = parseInt(sharesInput?.value, 10);

    if (!shares || shares <= 0) {
      window.soundFx?.playError();
      window.tradingTerminal.notify('Invalid Quantity', 'Please enter a valid share quantity greater than 0.', 'error');
      return;
    }

    if (this.orderType === 'MARKET') {
      window.tradingTerminal.executeMarketOrder(this.activeSymbol, this.orderSide, shares);
    } else {
      const targetPrice = parseFloat(limitPriceInput?.value);
      if (!targetPrice || targetPrice <= 0) {
        window.soundFx?.playError();
        window.tradingTerminal.notify('Invalid Limit Price', 'Please enter a valid target price.', 'error');
        return;
      }
      window.tradingTerminal.placePendingOrder(this.activeSymbol, this.orderSide, this.orderType, shares, targetPrice);
    }

    this.updateOrderSummary();
  }

  // --- Account & Portfolio Stats ---
  renderAccountStats() {
    const stats = window.tradingTerminal.getPortfolioStats();

    const netWorthEl = document.getElementById('hdr-net-worth');
    const buyingPowerEl = document.getElementById('hdr-buying-power');
    const dayPnlEl = document.getElementById('hdr-day-pnl');

    if (netWorthEl) netWorthEl.textContent = window.formatINR(stats.netWorth);
    if (buyingPowerEl) buyingPowerEl.textContent = window.formatINR(stats.cash);

    if (dayPnlEl) {
      const pfx = stats.totalUnrealizedPnL >= 0 ? '+' : '';
      const isUp = stats.totalUnrealizedPnL >= 0;
      dayPnlEl.className = `pnl-badge ${isUp ? 'up' : 'down'}`;
      dayPnlEl.innerHTML = `${pfx}₹${Math.abs(stats.totalUnrealizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${pfx}${stats.totalReturnPct.toFixed(2)}%)`;
    }

    const posCountBadge = document.getElementById('pos-count-badge');
    const pendingCountBadge = document.getElementById('pending-count-badge');

    if (posCountBadge) posCountBadge.textContent = stats.openPositionsCount;
    if (pendingCountBadge) pendingCountBadge.textContent = stats.pendingOrdersCount;
  }

  // --- Bottom Dock: Positions Table ---
  renderPositionsTable() {
    const tbody = document.getElementById('positions-tbody');
    if (!tbody) return;

    const positions = Object.values(window.tradingTerminal.positions);

    if (positions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-msg">
            No open positions. Use the terminal to place your first order on NSE!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = positions.map(pos => {
      const stock = window.marketData.getStock(pos.symbol);
      const curPrice = stock ? stock.price : pos.avgPrice;
      const totalVal = pos.shares * curPrice;
      const totalCost = pos.shares * pos.avgPrice;
      const pnlDollars = totalVal - totalCost;
      const pnlPct = ((pnlDollars / totalCost) * 100).toFixed(2);
      const isUp = pnlDollars >= 0;
      const pfx = isUp ? '+' : '';

      return `
        <tr>
          <td>
            <div class="table-sym-cell" onclick="window.app.switchStock('${pos.symbol}')">
              <span class="table-sym">${pos.symbol}</span>
              <span class="table-name">${stock?.name || ''}</span>
            </div>
          </td>
          <td><b>${pos.shares.toLocaleString('en-IN')}</b></td>
          <td>₹${pos.avgPrice.toFixed(2)}</td>
          <td>₹${curPrice.toFixed(2)}</td>
          <td>${window.formatINR(totalVal)}</td>
          <td class="${isUp ? 'text-up' : 'text-down'}">
            <b>${pfx}₹${Math.abs(pnlDollars).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b> (${pfx}${pnlPct}%)
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-action-close" onclick="window.tradingTerminal.closePosition('${pos.symbol}')">Exit Position</button>
              <button class="btn-action-buy" onclick="window.app.quickAddPosition('${pos.symbol}')">+ Buy More</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  quickAddPosition(symbol) {
    this.switchStock(symbol);
    const sharesInput = document.getElementById('order-shares-input');
    if (sharesInput) sharesInput.value = 10;
    this.updateOrderSummary();
  }

  // --- Bottom Dock: Pending Orders ---
  renderPendingOrdersTable() {
    const tbody = document.getElementById('pending-tbody');
    if (!tbody) return;

    const orders = window.tradingTerminal.pendingOrders;

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-msg">
            No active pending orders on order book.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(ord => `
      <tr>
        <td><code>#${ord.id}</code></td>
        <td><b>${ord.symbol}</b></td>
        <td><span class="order-side-tag ${ord.side.toLowerCase()}">${ord.side}</span></td>
        <td>${ord.orderMode}</td>
        <td>${ord.shares.toLocaleString('en-IN')}</td>
        <td>₹${ord.targetPrice.toFixed(2)}</td>
        <td>
          <button class="btn-cancel-order" onclick="window.tradingTerminal.cancelPendingOrder('${ord.id}')">Cancel</button>
        </td>
      </tr>
    `).join('');
  }

  // --- Bottom Dock: History Table ---
  renderHistoryTable() {
    const tbody = document.getElementById('history-tbody');
    if (!tbody) return;

    const history = window.tradingTerminal.tradeHistory;

    if (history.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-table-msg">
            No trade history recorded yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = history.map(t => {
      const d = new Date(t.timestamp);
      const timeStr = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      const pnlDisplay = t.type === 'SELL'
        ? `<span class="${t.realizedPnL >= 0 ? 'text-up' : 'text-down'}">${t.realizedPnL >= 0 ? '+₹' : '-₹'}${Math.abs(t.realizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>`
        : '<span class="text-muted">—</span>';

      return `
        <tr>
          <td><code>${t.id}</code></td>
          <td><b>${t.symbol}</b></td>
          <td><span class="order-side-tag ${t.type.toLowerCase()}">${t.type}</span></td>
          <td>${t.shares.toLocaleString('en-IN')}</td>
          <td>₹${t.price.toFixed(2)}</td>
          <td>${window.formatINR(t.total)}</td>
          <td>${pnlDisplay}</td>
          <td><span class="history-time">${timeStr}</span></td>
        </tr>
      `;
    }).join('');
  }

  // --- Bottom Dock: Portfolio Breakdown ---
  renderPortfolioBreakdown() {
    const container = document.getElementById('portfolio-breakdown-container');
    if (!container) return;

    const stats = window.tradingTerminal.getPortfolioStats();
    const positions = Object.values(window.tradingTerminal.positions);

    const cashPct = Math.max(0, (stats.cash / (stats.netWorth || 1)) * 100);

    let barsHtml = `
      <div class="alloc-item">
        <div class="alloc-header">
          <span>Unallocated Cash (INR)</span>
          <span>${window.formatINR(stats.cash)} (${cashPct.toFixed(1)}%)</span>
        </div>
        <div class="alloc-progress-bar">
          <div class="alloc-fill cash" style="width: ${cashPct}%;"></div>
        </div>
      </div>
    `;

    positions.forEach(pos => {
      const stock = window.marketData.getStock(pos.symbol);
      const curPrice = stock ? stock.price : pos.avgPrice;
      const val = pos.shares * curPrice;
      const pct = (val / (stats.netWorth || 1)) * 100;

      barsHtml += `
        <div class="alloc-item">
          <div class="alloc-header">
            <span>${pos.symbol} (${pos.shares} shares)</span>
            <span>${window.formatINR(val)} (${pct.toFixed(1)}%)</span>
          </div>
          <div class="alloc-progress-bar">
            <div class="alloc-fill stock" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="breakdown-grid">
        <div class="breakdown-metrics">
          <div class="metric-card">
            <span class="m-label">Total Portfolio Value</span>
            <span class="m-val">${window.formatINR(stats.netWorth)}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Invested Holding Equity</span>
            <span class="m-val">${window.formatINR(stats.equityValue)}</span>
          </div>
          <div class="metric-card">
            <span class="m-label">Realized Profit / Loss</span>
            <span class="m-val ${stats.realizedPnL >= 0 ? 'text-up' : 'text-down'}">
              ${stats.realizedPnL >= 0 ? '+₹' : '-₹'}${Math.abs(stats.realizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div class="metric-card">
            <span class="m-label">Total Unrealized P&L</span>
            <span class="m-val ${stats.totalUnrealizedPnL >= 0 ? 'text-up' : 'text-down'}">
              ${stats.totalUnrealizedPnL >= 0 ? '+₹' : '-₹'}${Math.abs(stats.totalUnrealizedPnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        <div class="breakdown-bars">
          <h4>Asset Allocation Breakdown</h4>
          ${barsHtml}
        </div>
      </div>
    `;
  }

  bindBottomDockTabs() {
    document.querySelectorAll('.dock-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.dock-pane').forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = tab.getAttribute('data-target');
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add('active');
        window.soundFx?.playTick();
      });
    });
  }

  bindModals() {
    const modal = document.getElementById('funds-modal');
    const openBtn = document.getElementById('btn-open-funds-modal');
    const closeBtn = document.getElementById('btn-close-funds-modal');

    openBtn?.addEventListener('click', () => {
      modal?.classList.add('active');
      window.soundFx?.playTick();
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });

    document.querySelectorAll('.btn-deposit-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const amt = parseFloat(btn.getAttribute('data-amount'));
        if (amt) {
          window.tradingTerminal.depositFunds(amt);
          modal?.classList.remove('active');
        }
      });
    });

    document.getElementById('btn-reset-demo-account')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset your demo account back to ₹10,00,000 cash?')) {
        window.tradingTerminal.resetAccount(1000000);
        modal?.classList.remove('active');
      }
    });

    const soundToggleBtn = document.getElementById('btn-sound-toggle');
    soundToggleBtn?.addEventListener('click', () => {
      const isEnabled = window.soundFx.toggle();
      soundToggleBtn.innerHTML = isEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
      soundToggleBtn.classList.toggle('muted', !isEnabled);
    });
  }

  bindToasts() {
    window.addEventListener('apex-toast', (e) => {
      this.showToast(e.detail);
    });
  }

  showToast({ title, message, type }) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `apex-toast ${type}`;

    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '⚡';

    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-desc">${message}</div>
      </div>
      <button class="toast-close">&times;</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4500);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppOrchestrator();
});
