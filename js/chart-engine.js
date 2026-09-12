/**
 * ApexTrader India - High-Performance Canvas Financial Chart Engine
 * Renders Candlesticks, Area/Line charts, Volume, Technical Indicators (SMA/EMA),
 * Crosshairs, and dynamic price/time axes formatted in Indian Rupees (₹).
 */

class FinancialChart {
  constructor(canvasContainerId) {
    this.container = document.getElementById(canvasContainerId);
    this.canvas = document.createElement('canvas');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Chart state
    this.symbol = 'RELIANCE';
    this.timeframe = '1D';
    this.chartType = 'candles';
    this.showSMA = true;
    this.showEMA = false;
    this.showVolume = true;

    this.padding = {
      top: 25,
      right: 85, // Extra room for ₹ INR price tags
      left: 10,
      bottom: 30
    };

    this.candles = [];
    this.hoverIndex = -1;
    this.mouseX = -1;
    this.mouseY = -1;
    this.isHovering = false;

    this.handleResize = this.handleResize.bind(this);
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.container);

    this.initEvents();
    this.loadData();
  }

  handleResize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.width = rect.width;
    this.height = rect.height;

    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);
    this.render();
  }

  initEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      this.isHovering = true;
      this.updateHoverIndex();
      this.render();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isHovering = false;
      this.hoverIndex = -1;
      this.render();
      this.dispatchTooltip(null);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        this.isHovering = true;
        this.updateHoverIndex();
        this.render();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.touches[0].clientX - rect.left;
        this.mouseY = e.touches[0].clientY - rect.top;
        this.isHovering = true;
        this.updateHoverIndex();
        this.render();
      }
    }, { passive: true });

    this.canvas.addEventListener('touchend', () => {
      this.isHovering = false;
      this.hoverIndex = -1;
      this.render();
      this.dispatchTooltip(null);
    });
  }

  setSymbol(symbol) {
    this.symbol = symbol;
    this.loadData();
  }

  setTimeframe(tf) {
    this.timeframe = tf;
    this.loadData();
  }

  setChartType(type) {
    this.chartType = type;
    this.render();
  }

  toggleIndicator(name) {
    if (name === 'sma') this.showSMA = !this.showSMA;
    if (name === 'ema') this.showEMA = !this.showEMA;
    if (name === 'volume') this.showVolume = !this.showVolume;
    this.render();
  }

  loadData() {
    this.candles = window.marketData.generateCandles(this.symbol, this.timeframe);
    this.render();
  }

  calculateSMA(period = 20) {
    const result = [];
    for (let i = 0; i < this.candles.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += this.candles[i - j].close;
        }
        result.push(sum / period);
      }
    }
    return result;
  }

  calculateEMA(period = 50) {
    const result = [];
    const k = 2 / (period + 1);
    let prevEMA = null;

    for (let i = 0; i < this.candles.length; i++) {
      const close = this.candles[i].close;
      if (i < period - 1) {
        result.push(null);
      } else if (i === period - 1) {
        let sum = 0;
        for (let j = 0; j < period; j++) sum += this.candles[i - j].close;
        prevEMA = sum / period;
        result.push(prevEMA);
      } else {
        const ema = close * k + prevEMA * (1 - k);
        result.push(ema);
        prevEMA = ema;
      }
    }
    return result;
  }

  updateHoverIndex() {
    if (!this.candles.length || !this.width) return;
    const plotWidth = this.width - this.padding.left - this.padding.right;
    const count = this.candles.length;
    const candleSpacing = plotWidth / count;

    const relX = this.mouseX - this.padding.left;
    const index = Math.floor(relX / candleSpacing);

    if (index >= 0 && index < count) {
      this.hoverIndex = index;
      this.dispatchTooltip(this.candles[index]);
    } else {
      this.hoverIndex = -1;
      this.dispatchTooltip(null);
    }
  }

  dispatchTooltip(candle) {
    const ev = new CustomEvent('chart-tooltip-update', {
      detail: { candle, symbol: this.symbol }
    });
    window.dispatchEvent(ev);
  }

  render() {
    if (!this.ctx || !this.width || !this.height) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (!this.candles || this.candles.length === 0) return;

    const count = this.candles.length;
    const plotW = w - this.padding.left - this.padding.right;
    const totalPlotH = h - this.padding.top - this.padding.bottom;

    const volHeight = this.showVolume ? Math.floor(totalPlotH * 0.2) : 0;
    const pricePlotH = totalPlotH - volHeight - (this.showVolume ? 15 : 0);

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let maxVolume = 0;

    for (let i = 0; i < count; i++) {
      const c = this.candles[i];
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
      if (c.volume > maxVolume) maxVolume = c.volume;
    }

    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.05;
    const plotMin = minPrice - pricePadding;
    const plotMax = maxPrice + pricePadding;
    const plotRange = plotMax - plotMin;

    const candleSpacing = plotW / count;
    const candleWidth = Math.max(2, candleSpacing * 0.72);

    const getX = (i) => this.padding.left + i * candleSpacing + candleSpacing / 2;
    const getY = (price) => this.padding.top + (1 - (price - plotMin) / plotRange) * pricePlotH;
    const getVolY = (vol) => (h - this.padding.bottom) - (vol / (maxVolume || 1)) * volHeight;

    // 1. Draw Grid Lines and Labels
    this.drawGridAndAxes(ctx, w, h, plotMin, plotMax, pricePlotH);

    // 2. Draw Volume Bars
    if (this.showVolume) {
      for (let i = 0; i < count; i++) {
        const c = this.candles[i];
        const cx = getX(i);
        const vy = getVolY(c.volume);
        const vh = (h - this.padding.bottom) - vy;
        const isUp = c.close >= c.open;

        ctx.fillStyle = isUp ? 'rgba(0, 245, 155, 0.22)' : 'rgba(255, 51, 102, 0.22)';
        ctx.fillRect(cx - candleWidth / 2, vy, candleWidth, Math.max(1, vh));
      }
    }

    // 3. Draw Candlesticks or Area Mode
    if (this.chartType === 'area') {
      this.drawAreaChart(ctx, count, getX, getY, h);
    } else {
      this.drawCandlesticks(ctx, count, getX, getY, candleWidth);
    }

    // 4. Draw Technical Indicators
    if (this.showSMA) {
      const smaValues = this.calculateSMA(20);
      this.drawIndicatorLine(ctx, smaValues, getX, getY, '#00d2ff', 'SMA (20)');
    }
    if (this.showEMA) {
      const emaValues = this.calculateEMA(50);
      this.drawIndicatorLine(ctx, emaValues, getX, getY, '#a855f7', 'EMA (50)');
    }

    // 5. Draw Active Market Price Marker Line & Badge in ₹
    const lastCandle = this.candles[count - 1];
    const lastPriceY = getY(lastCandle.close);
    const isUp = lastCandle.close >= (this.candles[0]?.open || lastCandle.open);
    const badgeColor = isUp ? '#00f59b' : '#ff3366';

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(this.padding.left, lastPriceY);
    ctx.lineTo(w - this.padding.right, lastPriceY);
    ctx.stroke();
    ctx.restore();

    // Price tag pill on right axis (with Rupee symbol ₹)
    ctx.fillStyle = badgeColor;
    const tagW = 78;
    const tagH = 20;
    const tagX = w - this.padding.right + 2;
    const tagY = Math.max(10, Math.min(h - 30, lastPriceY - tagH / 2));

    this.roundRect(ctx, tagX, tagY, tagW, tagH, 4, true, false);
    ctx.fillStyle = '#080b11';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`₹${lastCandle.close.toFixed(2)}`, tagX + tagW / 2, tagY + tagH / 2);

    // 6. Crosshair & Tooltip Overlay
    if (this.isHovering && this.hoverIndex >= 0 && this.hoverIndex < count) {
      const hc = this.candles[this.hoverIndex];
      const hx = getX(this.hoverIndex);
      const hy = getY(hc.close);

      ctx.save();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(hx, this.padding.top);
      ctx.lineTo(hx, h - this.padding.bottom);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(this.padding.left, this.mouseY);
      ctx.lineTo(w - this.padding.right, this.mouseY);
      ctx.stroke();

      // Horizontal crosshair price badge (in ₹)
      const cursorPrice = plotMax - ((this.mouseY - this.padding.top) / pricePlotH) * plotRange;
      if (this.mouseY >= this.padding.top && this.mouseY <= this.padding.top + pricePlotH) {
        ctx.fillStyle = '#1c2638';
        this.roundRect(ctx, tagX, this.mouseY - 10, tagW, 20, 3, true, false);
        ctx.fillStyle = '#f0f4fc';
        ctx.fillText(`₹${cursorPrice.toFixed(2)}`, tagX + tagW / 2, this.mouseY);
      }

      // Time badge at bottom
      const timeStr = this.formatTime(hc.time);
      const timeW = 90;
      ctx.fillStyle = '#1c2638';
      this.roundRect(ctx, hx - timeW / 2, h - this.padding.bottom + 4, timeW, 20, 3, true, false);
      ctx.fillStyle = '#f0f4fc';
      ctx.fillText(timeStr, hx, h - this.padding.bottom + 14);

      // Dot on candle close
      ctx.fillStyle = hc.close >= hc.open ? '#00f59b' : '#ff3366';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawGridAndAxes(ctx, w, h, plotMin, plotMax, pricePlotH) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(139, 155, 180, 0.7)';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const y = this.padding.top + ratio * pricePlotH;
      const priceVal = plotMax - ratio * (plotMax - plotMin);

      ctx.beginPath();
      ctx.moveTo(this.padding.left, y);
      ctx.lineTo(w - this.padding.right, y);
      ctx.stroke();

      ctx.fillText(`₹${priceVal.toFixed(2)}`, w - this.padding.right + 8, y);
    }

    const timeSteps = 5;
    const count = this.candles.length;
    ctx.textAlign = 'center';
    for (let i = 1; i < timeSteps; i++) {
      const idx = Math.floor((i / timeSteps) * count);
      const c = this.candles[idx];
      if (!c) continue;

      const plotW = w - this.padding.left - this.padding.right;
      const x = this.padding.left + idx * (plotW / count);

      ctx.beginPath();
      ctx.moveTo(x, this.padding.top);
      ctx.lineTo(x, h - this.padding.bottom);
      ctx.stroke();

      ctx.fillText(this.formatAxisTime(c.time), x, h - this.padding.bottom + 14);
    }

    ctx.restore();
  }

  drawCandlesticks(ctx, count, getX, getY, candleWidth) {
    for (let i = 0; i < count; i++) {
      const c = this.candles[i];
      const cx = getX(i);
      const openY = getY(c.open);
      const closeY = getY(c.close);
      const highY = getY(c.high);
      const lowY = getY(c.low);

      const isUp = c.close >= c.open;
      const color = isUp ? '#00f59b' : '#ff3366';

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(cx, highY);
      ctx.lineTo(cx, lowY);
      ctx.stroke();

      const top = Math.min(openY, closeY);
      const bodyH = Math.max(1.5, Math.abs(closeY - openY));
      ctx.fillRect(cx - candleWidth / 2, top, candleWidth, bodyH);
    }
  }

  drawAreaChart(ctx, count, getX, getY, h) {
    if (count === 0) return;

    const firstX = getX(0);
    const lastX = getX(count - 1);
    const baselineY = h - this.padding.bottom;

    const grad = ctx.createLinearGradient(0, this.padding.top, 0, baselineY);
    grad.addColorStop(0, 'rgba(0, 210, 255, 0.4)');
    grad.addColorStop(0.6, 'rgba(0, 245, 155, 0.12)');
    grad.addColorStop(1, 'rgba(0, 245, 155, 0.0)');

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(firstX, getY(this.candles[0].close));
    for (let i = 1; i < count; i++) {
      ctx.lineTo(getX(i), getY(this.candles[i].close));
    }
    ctx.lineTo(lastX, baselineY);
    ctx.lineTo(firstX, baselineY);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(firstX, getY(this.candles[0].close));
    for (let i = 1; i < count; i++) {
      ctx.lineTo(getX(i), getY(this.candles[i].close));
    }
    ctx.strokeStyle = '#00f59b';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }

  drawIndicatorLine(ctx, values, getX, getY, strokeStyle, label) {
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.6;
    ctx.beginPath();

    let started = false;
    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      if (val === null || val === undefined) continue;

      const x = getX(i);
      const y = getY(val);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  formatTime(timestamp) {
    const d = new Date(timestamp);
    if (this.timeframe === '1D') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  formatAxisTime(timestamp) {
    const d = new Date(timestamp);
    if (this.timeframe === '1D') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (this.timeframe === '1W' || this.timeframe === '1M') {
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }
    return d.toLocaleDateString([], { month: 'short', year: '2-digit' });
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }
}

window.FinancialChart = FinancialChart;
