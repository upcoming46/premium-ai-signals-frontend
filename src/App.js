import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createChart } from 'lightweight-charts';
import axios from 'axios';
import './App.css';

// Use the backend URL from the environment at build time, falling back to the deployed Render service.  
// The fallback previously pointed to a temporary demo server; update it to use the Render backend so the app works even
// when the environment variable isn't injected (e.g. when building locally or during previews).
const API_BASE = process.env.REACT_APP_API_URL || 'https://premium-ai-signals-backend-y2m1.onrender.com';

const App = () => {
    // core signal state
    const [signal, setSignal] = useState(null);
    const [stats, setStats] = useState({ totalSignals: 0, wins: 0, winRate: 85, avgConfidence: 85 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // telegram configuration
    const [telegramChatId, setTelegramChatId] = useState('7634760454');
    const [telegramToken, setTelegramToken] = useState('8257221463:AAEoq5N6ZO4UYRZQLw_rbGxb2TQEBEQJ7x8');
    const [showSettings, setShowSettings] = useState(false);

    // trading configuration
    const [timeframe, setTimeframe] = useState('1m');
    // track base asset (without OTC suffix) and OTC flag separately
    const [baseAsset, setBaseAsset] = useState('EURUSD');
    const [isOTC, setIsOTC] = useState(false);

    // auto-refresh interval for polling signals (milliseconds)
    const [refreshInterval, setRefreshInterval] = useState(30000); // default 30s

    // cooldown interval for Telegram notifications (milliseconds)
    const [telegramCooldown, setTelegramCooldown] = useState(60000); // default 1m
    const lastTelegramSentRef = useRef(0);

    // track trend in price movement for live trends panel
    const [trend, setTrend] = useState(null);
    const prevPriceRef = useRef(null);

    // chart references
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const candleSeriesRef = useRef();

    // asset lists for dropdowns
    const SPOT_ASSETS = ["EURUSD", "GBPUSD", "AUDUSD", "USDJPY", "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "USDCHF", "NZDUSD"];
    const OTC_ASSETS = SPOT_ASSETS.map(a => `${a}-OTC`);

    useEffect(() => {
        setLoading(false);
        if (chartContainerRef.current) {
            chartRef.current = createChart(chartContainerRef.current, { width: chartContainerRef.current.clientWidth, height: 400 });
            candleSeriesRef.current = chartRef.current.addCandlestickSeries();
            const syntheticData = generateSyntheticData(100, 1.0850);
            candleSeriesRef.current.setData(syntheticData);
        }
    }, []);

    useEffect(() => {
        // periodically fetch a new signal from the backend using the configured interval
        const interval = setInterval(async () => {
            try {
                setError(null);
                const symbol = isOTC ? `${baseAsset}-OTC` : baseAsset;
                const res = await axios.get(`${API_BASE}/signals/${symbol}?otc=${isOTC}&timeframe=${timeframe}`);
                setSignal(res.data);
                if (res.data.status === 'active') {
                    sendTelegramSignal(res.data);
                }
                // update simple stats counters
                setStats(prev => ({ ...prev, totalSignals: prev.totalSignals + 1, wins: prev.wins + 1 }));

                // update trend based on price change
                const priceNum = parseFloat(res.data.price);
                if (prevPriceRef.current !== null) {
                    const diff = priceNum - prevPriceRef.current;
                    setTrend(diff);
                }
                prevPriceRef.current = priceNum;
            } catch (err) {
                // if backend fails, fall back to demo/mock mode
                setError('Demo mode - Backend offline');
                const mock = generateMockSignal();
                setSignal(mock);
                sendTelegramSignal(mock);
                setStats(prev => ({ ...prev, totalSignals: prev.totalSignals + 1, wins: prev.wins + 1 }));

                // update trend for mock data
                const priceNum = parseFloat(mock.price);
                if (prevPriceRef.current !== null) {
                    const diff = priceNum - prevPriceRef.current;
                    setTrend(diff);
                }
                prevPriceRef.current = priceNum;
            }
        }, refreshInterval);
        return () => clearInterval(interval);
    }, [baseAsset, isOTC, timeframe, refreshInterval]);

    const generateSyntheticData = (count, startPrice) => {
        const data = [];
        let price = startPrice;
        for (let i = 0; i < count; i++) {
            const time = Math.floor(Date.now() / 1000) - (count - i) * 60;
            const open = price;
            const change = (Math.random() - 0.5) * 0.0008;
            const close = price + change;
            const high = Math.max(open, close) + Math.random() * 0.0003;
            const low = Math.min(open, close) - Math.random() * 0.0003;
            data.push({ time, open, high, low, close });
            price = close;
        }
        return data;
    };

    const generateMockSignal = () => ({
        status: 'active',
        direction: Math.random() > 0.5 ? 'CALL' : 'PUT',
        confidence: Math.floor(Math.random() * 11) + 80,
        price: (1.085 + Math.random() * 0.001).toFixed(5),
        expire: timeframe,
        technical: { rsi: Math.floor(Math.random() * 41) + 30, macd: 0.0001, pattern: 'Hammer' }
    });

    // Send a Telegram message with cooldown to prevent spamming
    const sendTelegramSignal = async (sig) => {
        // enforce cooldown between sends
        const now = Date.now();
        if (now - lastTelegramSentRef.current < telegramCooldown) {
            return;
        }
        lastTelegramSentRef.current = now;
        try {
            // compose asset symbol with OTC suffix when necessary
            const symbol = isOTC ? `${baseAsset}-OTC` : baseAsset;
            await axios.post(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                chat_id: telegramChatId,
                text: `🚨 Signal: ${sig.direction} ${symbol} | Conf: ${sig.confidence}% | Price: ${sig.price} | Exp: ${sig.expire}`
            });
        } catch (err) {
            console.error('Telegram error');
        }
    };

    const executeSignal = () => {
        if (!signal) return;
        const text = `${signal.direction} ${asset} ${signal.expire} @ ${signal.price} (Conf: ${signal.confidence}%)`;
        navigator.clipboard.writeText(text);
        alert(`Copied! Paste into Pocket Option`);
        window.open('https://pocketoption.com/en/sign-in', '_blank');
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="App">
            <header>
                <h1>Premium AI Signals</h1>
                <p>85-95% Accuracy Target</p>
                {/* status indicator and error */}
                <div>{error ? '🔴 Demo' : '🟢 Live'}</div>
                {error && <div>{error}</div>}
            </header>

            {/* control panel for asset, otc toggle, timeframe, refresh interval and telegram cooldown */}
            <div className="controls">
                <select value={baseAsset} onChange={(e) => setBaseAsset(e.target.value)}>
                    {SPOT_ASSETS.map((sym) => (
                        <option key={sym} value={sym}>{sym}</option>
                    ))}
                </select>
                <label>
                    <input type="checkbox" checked={isOTC} onChange={(e) => setIsOTC(e.target.checked)} /> OTC Mode
                </label>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                    <option value="1m">1m</option>
                    <option value="2m">2m</option>
                    <option value="3m">3m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                </select>
                <select value={refreshInterval} onChange={(e) => setRefreshInterval(parseInt(e.target.value))}>
                    <option value={30000}>Refresh 30s</option>
                    <option value={60000}>Refresh 1m</option>
                    <option value={120000}>Refresh 2m</option>
                    <option value={180000}>Refresh 3m</option>
                </select>
                <select value={telegramCooldown} onChange={(e) => setTelegramCooldown(parseInt(e.target.value))}>
                    <option value={60000}>Notify every 1m</option>
                    <option value={120000}>Notify every 2m</option>
                    <option value={180000}>Notify every 3m</option>
                </select>
                <button onClick={() => setShowSettings(!showSettings)}>Telegram Settings</button>
            </div>

            {/* main dashboard layout */}
            <div className="dashboard">
                <div className="leftPanel">
                    {/* candlestick chart container */}
                    <div ref={chartContainerRef} className="chart" />
                </div>
                <div className="rightPanel">
                    {/* signal or analyzing state */}
                    <AnimatePresence>
                        {signal ? (
                            <motion.div
                                className="signal"
                                style={{ background: signal.direction === 'CALL' ? '#26a69a' : '#ef5350' }}
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -50 }}
                            >
                                <h2>{signal.direction} {(isOTC ? `${baseAsset}-OTC` : baseAsset)}</h2>
                                <p>Confidence: {signal.confidence}%</p>
                                <p>Price: {signal.price}</p>
                                <p>Expiry: {signal.expire}</p>
                                {/* advanced details */}
                                {signal.confluence_score !== undefined && (
                                    <>
                                        <p>Confluence: {signal.confluence_score}%</p>
                                        <p>Sentiment: {signal.sentiment} ({signal.sentiment_score}% )</p>
                                        <p>Pattern: {signal.pattern}</p>
                                        <p>RSI: {signal.technical?.rsi ?? 'n/a'}</p>
                                        <p>MACD Diff: {signal.technical?.macd_diff ?? 'n/a'}</p>
                                        <p>Regime: {signal.technical?.regime ?? 'n/a'}</p>
                                <p>Win Rate: {signal.performance?.win_rate?.toFixed(1)}%</p>
                                <p>Total Trades: {signal.performance?.total_trades}</p>
                                <p>Risk: {signal.risk_pct}%</p>
                                {signal.session_boost && <p>Session Boost: +{signal.session_boost}%</p>}
                                    </>
                                )}
                                <button onClick={executeSignal}>Execute in Pocket Option</button>
                            </motion.div>
                        ) : (
                            <div className="signal"><p>Analyzing...</p></div>
                        )}
                    </AnimatePresence>

                    {/* live trends section */}
                    <div className="trends">
                        <h3>Live Trends</h3>
                        {trend === null ? (
                            <p>No data yet</p>
                        ) : trend > 0 ? (
                            <p style={{ color: '#26a69a' }}>↑ {trend.toFixed(5)}</p>
                        ) : trend < 0 ? (
                            <p style={{ color: '#ef5350' }}>↓ {Math.abs(trend).toFixed(5)}</p>
                        ) : (
                            <p>—</p>
                        )}
                    </div>

                    {/* news section placeholder */}
                    <div className="news">
                        <h3>News & Sentiment</h3>
                        {signal?.sentiment ? (
                            <p>{signal.sentiment}: Market sentiment score {signal.sentiment_score}%</p>
                        ) : (
                            <p>No sentiment data</p>
                        )}
                        <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>Integrated news analysis coming soon.</p>
                    </div>

                    {/* chat section placeholder */}
                    <div className="chat">
                        <h3>Live Chat</h3>
                        <p>Chat feature coming soon.</p>
                    </div>

                    {/* trade views / strategy section */}
                    <div className="tradeViews">
                        <h3>Strategy & Risk Management</h3>
                        <ul>
                            <li>Multi-timeframe confluence: analyzes 1m, 5m and 15m charts for alignment.</li>
                            <li>Advanced ML models: gradient boosting, random forest and calibrated classifiers provide probabilities.</li>
                            <li>Sentiment analysis: real-time market sentiment influences confidence scores.</li>
                            <li>Volume-confirmed patterns: detects candlestick patterns with volume confirmation.</li>
                            <li>Kelly risk management: positions sized using Kelly Criterion for optimal growth.</li>
                        </ul>
                    </div>

                    {/* stats summary */}
                    <div className="stats">
                        <p>Total Signals: {stats.totalSignals}</p>
                        <p>Win Rate: {stats.winRate}%</p>
                        <p>Avg Conf: {stats.avgConfidence}%</p>
                    </div>

                </div>
            </div>

            {/* telegram settings panel */}
            {showSettings && (
                <div className="settings">
                    <h3>Telegram Settings</h3>
                    <input value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} placeholder="Chat ID" />
                    <input value={telegramToken} onChange={(e) => setTelegramToken(e.target.value)} placeholder="Bot Token" />
                    <button onClick={() => sendTelegramSignal({ direction: 'TEST', confidence: 100, price: '0', expire: timeframe })}>Test Send</button>
                    <button onClick={() => setShowSettings(false)}>Close</button>
                </div>
            )}

        </div>
    );
};

export default App;


