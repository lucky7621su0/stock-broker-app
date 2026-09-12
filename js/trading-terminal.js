/**
 * ApexTrader India - Brokerage Account & Order Execution Engine
 * Indian Rupee (INR ₹) denominated paper trading brokerage account.
 * Manages ₹10,00,000 starting cash, NSE/BSE stock positions, limit orders,
 * realized/unrealized P&L in Rupees, and local persistence.
 */

const STORAGE_KEY = 'apextrader_v2_inr_account';

// Formats number in standard Indian numbering system (Lakhs & Crores)
function formatINR(val, includeDecimals = true) {
  if (isNaN(val)) return '₹0.00';
  const isNeg = val < 0;
  const absVal = Math.abs(val);
  const formatted = absVal.toLocaleString('en-IN', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0
  });
  return `${isNeg ? '-' : ''}₹${formatted}`;
}

class TradingTerminal {
  constructor() {
    this.cash = 1000000.00; // ₹10,00,000 (10 Lakhs INR)
    this.positions = {};
    this.pendingOrders = [];
    this.tradeHistory = [];
    this.realizedPnL = 0;

    this.loadState();
    this.setupListeners();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this.cash = Number(data.cash) || 1000000.00;
        this.positions = data.positions || {};
        this.pendingOrders = data.pendingOrders || [];
        this.tradeHistory = data.tradeHistory || [];
        this.realizedPnL = Number(data.realizedPnL) || 0;
      } else {
        // Initial welcome demo position in RELIANCE (50 shares @ ₹2,920.00)
        const relCost = 50 * 2920.00;
        this.positions['RELIANCE'] = { symbol: 'RELIANCE', shares: 50, avgPrice: 2920.00 };
        this.cash = 1000000.00 - relCost;
        this.tradeHistory.push({
          id: 'NSE-' + Date.now().toString().slice(-6),
          symbol: 'RELIANCE',
          type: 'BUY',
          shares: 50,
          price: 2920.00,
          total: relCost,
          realizedPnL: 0,
          timestamp: Date.now() - 3600 * 1000 * 3
        });
        this.saveState();
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
  }

  saveState() {
    try {
      const payload = {
        cash: this.cash,
        positions: this.positions,
        pendingOrders: this.pendingOrders,
        tradeHistory: this.tradeHistory,
        realizedPnL: this.realizedPnL
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  setupListeners() {
    window.marketData.subscribe((stocks) => {
      this.evaluatePendingOrders(stocks);
    });
  }

  executeMarketOrder(symbol, side, shares) {
    const stock = window.marketData.getStock(symbol);
    if (!stock) return { success: false, message: 'Invalid symbol' };

    const price = stock.price;
    const totalCost = shares * price;

    if (side === 'BUY') {
      if (this.cash < totalCost) {
        window.soundFx?.playError();
        this.notify('Insufficient Margin', `Need ${formatINR(totalCost)} but available buying power is only ${formatINR(this.cash)}.`, 'error');
        return { success: false, message: 'Insufficient funds' };
      }

      this.cash -= totalCost;

      if (!this.positions[symbol]) {
        this.positions[symbol] = { symbol, shares, avgPrice: price };
      } else {
        const cur = this.positions[symbol];
        const oldTotalCost = cur.shares * cur.avgPrice;
        const newShares = cur.shares + shares;
        const newAvg = (oldTotalCost + totalCost) / newShares;
        cur.shares = newShares;
        cur.avgPrice = newAvg;
      }

      this.tradeHistory.unshift({
        id: 'NSE-' + Math.floor(100000 + Math.random() * 900000),
        symbol,
        type: 'BUY',
        shares,
        price,
        total: totalCost,
        realizedPnL: 0,
        timestamp: Date.now()
      });

      window.soundFx?.playBuy();
      this.notify('NSE Order Executed (BUY)', `Bought ${shares} shares of ${symbol} @ ₹${price.toFixed(2)} (${formatINR(totalCost)})`, 'success');
    } else {
      // SELL
      const cur = this.positions[symbol];
      if (!cur || cur.shares < shares) {
        window.soundFx?.playError();
        const available = cur ? cur.shares : 0;
        this.notify('Sell Order Rejected', `You only hold ${available} shares of ${symbol}.`, 'error');
        return { success: false, message: 'Insufficient shares' };
      }

      const proceed = shares * price;
      const costBasis = shares * cur.avgPrice;
      const tradePnL = proceed - costBasis;

      this.cash += proceed;
      this.realizedPnL += tradePnL;
      cur.shares -= shares;

      if (cur.shares <= 0) {
        delete this.positions[symbol];
      }

      this.tradeHistory.unshift({
        id: 'NSE-' + Math.floor(100000 + Math.random() * 900000),
        symbol,
        type: 'SELL',
        shares,
        price,
        total: proceed,
        realizedPnL: tradePnL,
        timestamp: Date.now()
      });

      window.soundFx?.playSell();
      const pnlPrefix = tradePnL >= 0 ? '+₹' : '-₹';
      this.notify(
        'NSE Order Executed (SELL)',
        `Sold ${shares} shares of ${symbol} @ ₹${price.toFixed(2)}. Realized P&L: ${pnlPrefix}${Math.abs(tradePnL).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        tradePnL >= 0 ? 'success' : 'warning'
      );
    }

    this.saveState();
    this.dispatchUpdate();
    return { success: true };
  }

  placePendingOrder(symbol, side, orderMode, shares, targetPrice) {
    const stock = window.marketData.getStock(symbol);
    if (!stock) return { success: false, message: 'Invalid symbol' };

    const estTotal = shares * targetPrice;

    if (side === 'BUY' && this.cash < estTotal) {
      window.soundFx?.playError();
      this.notify('Order Exceeds Buying Power', `Placing this limit order would require ${formatINR(estTotal)}.`, 'error');
      return { success: false, message: 'Insufficient cash' };
    }

    if (side === 'SELL') {
      const cur = this.positions[symbol];
      if (!cur || cur.shares < shares) {
        window.soundFx?.playError();
        this.notify('Order Exceeds Holdings', `You do not have ${shares} shares of ${symbol} to sell.`, 'error');
        return { success: false, message: 'Insufficient shares' };
      }
    }

    const order = {
      id: 'NSE-' + Math.floor(100000 + Math.random() * 900000),
      symbol,
      side,
      orderMode,
      shares,
      targetPrice,
      createdAt: Date.now()
    };

    this.pendingOrders.push(order);
    this.saveState();
    this.dispatchUpdate();

    this.notify(
      `${orderMode} Order Placed`,
      `${side} ${shares} ${symbol} @ ₹${targetPrice.toFixed(2)} queued in order book.`,
      'info'
    );
    return { success: true, order };
  }

  cancelPendingOrder(orderId) {
    const idx = this.pendingOrders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      const order = this.pendingOrders[idx];
      this.pendingOrders.splice(idx, 1);
      this.saveState();
      this.dispatchUpdate();
      this.notify('Order Cancelled', `Order #${order.id} (${order.symbol}) cancelled.`, 'info');
    }
  }

  evaluatePendingOrders(stocks) {
    if (this.pendingOrders.length === 0) return;

    const remaining = [];
    let stateChanged = false;

    for (const order of this.pendingOrders) {
      const stock = stocks[order.symbol];
      if (!stock) {
        remaining.push(order);
        continue;
      }

      const p = stock.price;
      let shouldFill = false;

      if (order.orderMode === 'LIMIT') {
        if (order.side === 'BUY' && p <= order.targetPrice) shouldFill = true;
        if (order.side === 'SELL' && p >= order.targetPrice) shouldFill = true;
      } else if (order.orderMode === 'STOP') {
        if (order.side === 'SELL' && p <= order.targetPrice) shouldFill = true;
      }

      if (shouldFill) {
        stateChanged = true;
        this.executeMarketOrder(order.symbol, order.side, order.shares);
      } else {
        remaining.push(order);
      }
    }

    if (stateChanged) {
      this.pendingOrders = remaining;
      this.saveState();
      this.dispatchUpdate();
    }
  }

  closePosition(symbol) {
    const pos = this.positions[symbol];
    if (pos && pos.shares > 0) {
      return this.executeMarketOrder(symbol, 'SELL', pos.shares);
    }
    return { success: false, message: 'Position not found' };
  }

  depositFunds(amount) {
    if (amount <= 0) return;
    this.cash += amount;
    this.saveState();
    this.dispatchUpdate();
    this.notify('Funds Deposited', `Credited ${formatINR(amount)} into your trading account.`, 'success');
  }

  resetAccount(balance = 1000000) {
    this.cash = balance;
    this.positions = {};
    this.pendingOrders = [];
    this.tradeHistory = [];
    this.realizedPnL = 0;
    this.saveState();
    this.dispatchUpdate();
    this.notify('Account Reset', `Demo balance reset to ${formatINR(balance)}.`, 'info');
  }

  getPortfolioStats() {
    let equityValue = 0;
    let totalUnrealizedPnL = 0;
    let totalCostBasis = 0;

    for (const sym of Object.keys(this.positions)) {
      const pos = this.positions[sym];
      const stock = window.marketData.getStock(sym);
      const currentPrice = stock ? stock.price : pos.avgPrice;
      const curValue = pos.shares * currentPrice;
      const cost = pos.shares * pos.avgPrice;
      const pnl = curValue - cost;

      equityValue += curValue;
      totalCostBasis += cost;
      totalUnrealizedPnL += pnl;
    }

    const netWorth = this.cash + equityValue;
    const initialDeposit = 1000000;
    const totalReturnDollars = netWorth - initialDeposit;
    const totalReturnPct = ((netWorth - initialDeposit) / initialDeposit) * 100;

    return {
      cash: this.cash,
      equityValue,
      netWorth,
      totalUnrealizedPnL,
      totalCostBasis,
      totalReturnDollars,
      totalReturnPct,
      realizedPnL: this.realizedPnL,
      openPositionsCount: Object.keys(this.positions).length,
      pendingOrdersCount: this.pendingOrders.length
    };
  }

  dispatchUpdate() {
    const ev = new CustomEvent('account-updated', { detail: this.getPortfolioStats() });
    window.dispatchEvent(ev);
  }

  notify(title, message, type = 'info') {
    const ev = new CustomEvent('apex-toast', {
      detail: { title, message, type, time: Date.now() }
    });
    window.dispatchEvent(ev);
  }
}

window.formatINR = formatINR;
window.tradingTerminal = new TradingTerminal();
