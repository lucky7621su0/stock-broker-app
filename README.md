# 📈 ApexTrader India - NSE & BSE Stock Market Broker Terminal

![ApexTrader Pro](https://img.shields.io/badge/Platform-Web%20App-00d2ff?style=for-the-badge)
![Market](https://img.shields.io/badge/Exchange-NSE%20%7C%20BSE-00f59b?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)

A high-performance, institutional-grade web stock market trading platform and paper brokerage terminal built specifically for the **Indian Stock Market (NSE & BSE)**.

Inspired by Bloomberg Terminal, TradingView, and Zerodha Kite, ApexTrader India features real-time simulated tick price streaming, interactive canvas candlestick charting, a Level 2 market depth ladder, and a full paper trading account in Indian Rupees (`₹`).

---

## ✨ Features

- **🇮🇳 Indian Equities Universe**: Pre-configured with top NSE blue-chips:
  - Reliance Industries (`RELIANCE`), TCS (`TCS`), HDFC Bank (`HDFCBANK`), Infosys (`INFY`), ICICI Bank (`ICICIBANK`), Tata Motors (`TATAMOTORS`), Bharti Airtel (`BHARTIARTL`), ITC (`ITC`), State Bank of India (`SBIN`), Larsen & Toubro (`LT`), Sun Pharma (`SUNPHARMA`), Bajaj Finance (`BAJFINANCE`), Tata Steel (`TATASTEEL`), and Zomato (`ZOMATO`).
- **📊 Real-Time Indices Marquee**: Live ticker tape for **NIFTY 50**, **BANK NIFTY**, **SENSEX**, **NIFTY IT**, **FINNIFTY**, and **INDIA VIX**.
- **🕯️ High-DPI Canvas Chart Engine**:
  - Candlestick and Mountain/Area line modes.
  - Multi-timeframes: `1D`, `1W`, `1M`, `3M`, and `1Y`.
  - Technical indicator overlays: **SMA (20)**, **EMA (50)**, and **Volume Histogram**.
  - Interactive crosshair hover readout with precise Open, High, Low, Close, Volume, and % Change.
- **⚡ Level 2 Market Depth (Order Book)**:
  - Live Bid/Ask depth ladder with dynamic animated depth bars.
  - Spread indicator and mid-market price calculation.
  - One-click price fill from order book rows to the trading terminal.
- **💼 ₹10,00,000 Paper Brokerage Account**:
  - Instant Market Orders and trigger-based Limit / Stop Loss orders.
  - Real-time unrealized & realized P&L calculations in Indian Rupees (`₹`).
  - Standard Indian numbering format (Lakhs & Crores).
  - Web Audio API synthesized order execution sound effects.
  - Persistent state in browser `localStorage`.
- **📂 Portfolio & Order Management Dock**:
  - Open Holdings with quick "Exit Position" and "+ Buy More".
  - Pending orders management with one-click cancellation.
  - Complete trade audit log with timestamps.
  - Dynamic asset allocation progress visualization.

---

## 🚀 Quick Start

ApexTrader India is built with zero external runtime dependencies. You can run it instantly with any local web server:

### Using Python:
```bash
cd stock-broker-app
python -m http.server 8085
```
Open **[http://localhost:8085](http://localhost:8085)** in your browser.

### Using Node / npx:
```bash
npx serve -l 8085
```

---

## 📁 Project Structure

```
stock-broker-app/
├── index.html              # Main terminal shell & layout
├── css/
│   └── style.css           # Obsidian dark design system & animations
├── js/
│   ├── market-data.js      # NSE/BSE stock catalog & tick streamer
│   ├── chart-engine.js     # Canvas financial chart & indicators
│   ├── order-book.js       # Level 2 market depth visualizer
│   ├── trading-terminal.js # Paper broker account & execution engine
│   ├── sound.js            # Synthesized Web Audio API sound effects
│   └── app.js              # Application orchestrator & UI bindings
└── README.md
```

---

## 🛠️ Technology Stack

- **Core**: HTML5 Semantic Architecture, Modular Vanilla JavaScript (ES6+)
- **Styling**: Modern CSS3, Obsidian Dark Palette, Glassmorphism, CSS Grid & Flexbox
- **Graphics**: HTML5 Canvas 2D Rendering Context (Retina / High-DPI calibrated)
- **Audio**: Web Audio API (Synthesized oscillators)
- **Persistence**: Web Storage API (`localStorage`)

---

## 📄 License

This project is licensed under the MIT License.
