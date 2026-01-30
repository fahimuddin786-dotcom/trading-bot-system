// src/components/UserDashboard.js - COMPLETE WITH DELTA EXCHANGE AUTO TRADING
import React, { useState, useEffect, useRef } from 'react';
import './UserDashboard.css';

const UserDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('signals');
  const [tradingStatus, setTradingStatus] = useState('LIVE TRADING');
  const [backendStatus, setBackendStatus] = useState(true);
  const [wsStatus, setWsStatus] = useState(true);
  const [signals, setSignals] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('Loading...');
  const [isConnected, setIsConnected] = useState(true);
  
  // Delta Exchange States
  const [deltaConnected, setDeltaConnected] = useState(false);
  const [algoEnabled, setAlgoEnabled] = useState(user?.algoEnabled || false);
  const [deltaApiKey, setDeltaApiKey] = useState('');
  const [deltaApiSecret, setDeltaApiSecret] = useState('');
  const [deltaTestnet, setDeltaTestnet] = useState(true);
  const [deltaBalance, setDeltaBalance] = useState([]);
  const [deltaPositions, setDeltaPositions] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  
  // Real-time price states
  const [ethPrice, setEthPrice] = useState('$0.00');
  const [btcPrice, setBtcPrice] = useState('$0.00');
  const [solPrice, setSolPrice] = useState('$0.00');
  const [ethChange, setEthChange] = useState('+0.00%');
  const [btcChange, setBtcChange] = useState('+0.00%');
  const [solChange, setSolChange] = useState('+0.00%');
  
  // Stats
  const [totalProfit, setTotalProfit] = useState('$0.00');
  const [winRate, setWinRate] = useState('0%');
  const [activeTrades, setActiveTrades] = useState(0);
  const [totalSignals, setTotalSignals] = useState(0);
  
  const wsRef = useRef(null);
  const currentPricesRef = useRef({});
  const wsReconnectRef = useRef(null);

  const HOSTNAME = window.location.hostname;
  const IS_LOCAL = HOSTNAME === 'localhost' || HOSTNAME === '127.0.0.1';
  const BACKEND_URL = IS_LOCAL ? 'http://localhost:8080' : window.location.origin;
  const WS_URL = BACKEND_URL.replace('http', 'ws');

  const getToken = () => localStorage.getItem('token');

  // Initialize dashboard
  useEffect(() => {
    console.log('🚀 User Dashboard Initializing...');
    console.log('👤 User:', user?.name);
    
    checkConnections();
    setupWebSocket();
    loadUserData();
    loadSignals();
    loadOrders();
    setupPriceUpdates();
    
    const refreshInterval = setInterval(() => {
      loadSignals();
      setupPriceUpdates();
      if (deltaConnected) {
        loadDeltaBalance();
        loadDeltaPositions();
      }
    }, 30000);
    
    return () => {
      clearInterval(refreshInterval);
      if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  // Load user data from server
  const loadUserData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setAlgoEnabled(data.user.algoEnabled || false);
          setDeltaConnected(!!data.user.deltaConfig);
          if (data.user.deltaConfig) {
            loadDeltaBalance();
            loadDeltaPositions();
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // Load signals
  const loadSignals = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/signals`);
      if (response.ok) {
        const data = await response.json();
        if (data.signals) {
          setSignals(data.signals.slice(0, 10));
          setTotalSignals(data.count || 0);
        }
      }
    } catch (error) {
      console.error('Error loading signals:', error);
    }
  };

  // Load user orders
  const loadOrders = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/orders`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserOrders(data.orders || []);
          const executed = data.orders.filter(o => o.status === 'executed');
          setActiveTrades(executed.length);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    }
  };

  // Check backend connection
  const checkConnections = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      setBackendStatus(true);
      setTradingStatus(data.environment === 'production' ? 'LIVE TRADING' : 'DEMO MODE');
    } catch (error) {
      setBackendStatus(false);
    }
  };

  // Setup WebSocket
  const setupWebSocket = () => {
    if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    try {
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        setWsStatus(true);
        setIsConnected(true);
        wsRef.current.send(JSON.stringify({
          type: 'SUBSCRIBE_SIGNALS',
          userId: user?.id,
          timestamp: new Date().toISOString()
        }));
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('WS parse error:', error);
        }
      };
      
      wsRef.current.onclose = () => {
        setWsStatus(false);
        setIsConnected(false);
        wsReconnectRef.current = setTimeout(setupWebSocket, 5000);
      };
      
      wsRef.current.onerror = () => setWsStatus(false);
    } catch (error) {
      console.error('WS error:', error);
    }
  };

  // Handle WebSocket messages
  const handleWebSocketMessage = (data) => {
    switch(data.type) {
      case 'NEW_SIGNAL':
        handleNewSignal(data.data);
        break;
      case 'TRADE_EXECUTED':
        showNotification('Trade Executed!', `${data.signal?.symbol} ${data.signal?.signal} order placed`, 'success');
        loadOrders();
        break;
      case 'TRADE_FAILED':
        showNotification('Trade Failed', data.error || 'Unknown error', 'error');
        break;
      case 'PRICE_UPDATE':
        if (data.prices) {
          updatePriceDisplay('ETHUSDT', data.prices.ETHUSDT);
          updatePriceDisplay('BTCUSDT', data.prices.BTCUSDT);
          updatePriceDisplay('SOLUSDT', data.prices.SOLUSDT);
        }
        break;
      default:
        break;
    }
  };

  // Handle new signal
  const handleNewSignal = (signalData) => {
    setSignals(prev => [signalData, ...prev].slice(0, 10));
    setTotalSignals(prev => prev + 1);
    
    setActivityLog(prev => [{
      type: 'signal',
      symbol: signalData.symbol,
      action: signalData.signal,
      message: `New ${signalData.type} signal`,
      timestamp: new Date()
    }, ...prev].slice(0, 10));
    
    if (algoEnabled) {
      showNotification('Signal Received', `Auto-trading ${signalData.symbol} ${signalData.signal}`, 'info');
    }
  };

  // Setup price updates
  const setupPriceUpdates = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/prices`);
      if (response.ok) {
        const data = await response.json();
        if (data.prices) {
          updatePriceDisplay('ETHUSDT', data.prices.ETHUSDT);
          updatePriceDisplay('BTCUSDT', data.prices.BTCUSDT);
          updatePriceDisplay('SOLUSDT', data.prices.SOLUSDT);
        }
      }
    } catch (error) {
      console.error('Price fetch error:', error);
    }
    setLastUpdated(new Date().toLocaleTimeString());
  };

  // Update price display
  const updatePriceDisplay = (symbol, newPrice) => {
    if (!newPrice) return;
    const symbolKey = symbol.replace('USDT', '').toLowerCase();
    const oldPrice = currentPricesRef.current[symbol] || newPrice;
    currentPricesRef.current[symbol] = newPrice;
    
    const formattedPrice = newPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const change = ((newPrice - oldPrice) / oldPrice * 100);
    const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
    
    switch(symbolKey) {
      case 'eth': setEthPrice(`$${formattedPrice}`); setEthChange(changeText); break;
      case 'btc': setBtcPrice(`$${formattedPrice}`); setBtcChange(changeText); break;
      case 'sol': setSolPrice(`$${formattedPrice}`); setSolChange(changeText); break;
    }
  };

  // Show notification
  const showNotification = (title, message, type = 'info') => {
    setNotification({ show: true, message: `${title}: ${message}`, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 5000);
  };

  // Test Delta Exchange connection
  const testDeltaConnection = async () => {
    if (!deltaApiKey || !deltaApiSecret) {
      showNotification('Error', 'Please enter API Key and Secret', 'error');
      return;
    }
    
    setIsTestingConnection(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/delta/test-connection`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: deltaApiKey, apiSecret: deltaApiSecret, testnet: deltaTestnet })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification('Success', 'Delta Exchange connected!', 'success');
        setDeltaBalance(data.balances || []);
      } else {
        showNotification('Error', data.message || 'Connection failed', 'error');
      }
    } catch (error) {
      showNotification('Error', 'Connection test failed', 'error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Save Delta config
  const saveDeltaConfig = async () => {
    if (!deltaApiKey || !deltaApiSecret) {
      showNotification('Error', 'Please enter API Key and Secret', 'error');
      return;
    }
    
    setIsSavingConfig(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/delta/save-config`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: deltaApiKey, apiSecret: deltaApiSecret, testnet: deltaTestnet })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification('Success', 'Configuration saved!', 'success');
        setDeltaConnected(true);
        loadDeltaBalance();
        loadDeltaPositions();
      } else {
        showNotification('Error', data.message || 'Failed to save', 'error');
      }
    } catch (error) {
      showNotification('Error', 'Failed to save configuration', 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Toggle algo trading
  const toggleAlgoTrading = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user/toggle-algo`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !algoEnabled })
      });
      
      const data = await response.json();
      if (data.success) {
        setAlgoEnabled(!algoEnabled);
        showNotification('Success', `Algo trading ${!algoEnabled ? 'enabled' : 'disabled'}`, 'success');
      } else {
        showNotification('Error', data.message || 'Failed to toggle algo', 'error');
      }
    } catch (error) {
      showNotification('Error', 'Failed to toggle algo trading', 'error');
    }
  };

  // Load Delta balance
  const loadDeltaBalance = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/delta/balance`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setDeltaBalance(data.balances || []);
      }
    } catch (error) {
      console.error('Balance error:', error);
    }
  };

  // Load Delta positions
  const loadDeltaPositions = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/delta/positions`, {
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setDeltaPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Positions error:', error);
    }
  };

  // Get time ago
  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${Math.floor(diffHour / 24)}d ago`;
  };

  return (
    <div className="user-dashboard">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`notification ${notification.type} show`}>
          {notification.message}
        </div>
      )}

      <div className="user-container">
        {/* Header */}
        <div className="user-header">
          <div className="logo">
            <h1>🤖 AI Trading Bot</h1>
            <div className={`status-badge ${algoEnabled ? 'status-live' : 'status-demo'}`}>
              <span className="pulse">●</span> {algoEnabled ? 'ALGO ENABLED' : 'ALGO DISABLED'}
            </div>
          </div>
          
          <div className="user-info">
            <span className="user-name">👤 {user?.name || 'User'}</span>
            <span className="user-email">{user?.email}</span>
            {user?.role === 'admin' && (
              <a href="/admin" className="admin-link">🔐 Admin</a>
            )}
            <button className="logout-btn" onClick={onLogout}>🚪 Logout</button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="connection-status">
          <div className="connection-item">
            <div className={`connection-dot ${backendStatus ? 'connection-online' : 'connection-offline'}`}></div>
            <span>Backend: {backendStatus ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="connection-item">
            <div className={`connection-dot ${wsStatus ? 'connection-online' : 'connection-offline'}`}></div>
            <span>WebSocket: {wsStatus ? 'Connected' : 'Disconnected'}</span>
          </div>
          <div className="connection-item">
            <div className={`connection-dot ${deltaConnected ? 'connection-online' : 'connection-offline'}`}></div>
            <span>Delta: {deltaConnected ? 'Connected' : 'Not Connected'}</span>
          </div>
        </div>

        {/* Price Ticker */}
        <div className="price-ticker">
          <div className="price-item">
            <span className="price-symbol">ETH/USDT:</span>
            <span className="price-value">{ethPrice}</span>
            <span className={`price-change ${ethChange.includes('+') ? 'positive' : 'negative'}`}>{ethChange}</span>
          </div>
          <div className="price-item">
            <span className="price-symbol">BTC/USDT:</span>
            <span className="price-value">{btcPrice}</span>
            <span className={`price-change ${btcChange.includes('+') ? 'positive' : 'negative'}`}>{btcChange}</span>
          </div>
          <div className="price-item">
            <span className="price-symbol">SOL/USDT:</span>
            <span className="price-value">{solPrice}</span>
            <span className={`price-change ${solChange.includes('+') ? 'positive' : 'negative'}`}>{solChange}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button className={`tab-btn ${activeTab === 'signals' ? 'active' : ''}`} onClick={() => setActiveTab('signals')}>📡 Signals</button>
          <button className={`tab-btn ${activeTab === 'delta' ? 'active' : ''}`} onClick={() => setActiveTab('delta')}>💰 Delta Exchange</button>
          <button className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>📋 My Orders</button>
          <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>⚙️ Settings</button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Signals Tab */}
          {activeTab === 'signals' && (
            <div className="signals-section">
              <div className="section-header">
                <h2>🎯 Live Trading Signals</h2>
                <button className="refresh-btn" onClick={loadSignals}>🔄 Refresh</button>
              </div>
              
              <div className="signals-grid">
                {signals.length > 0 ? signals.map((signal, index) => (
                  <div key={signal.id || index} className="signal-card">
                    <div className="signal-header">
                      <span className={`signal-type ${signal.signal === 'BUY' ? 'buy' : 'sell'}`}>
                        {signal.signal === 'BUY' ? '🟢 BUY' : '🔴 SELL'}
                      </span>
                      <span className="signal-badge">{signal.type === 'PURE_SIGNAL' ? '🎯 PURE' : '📊 LST'}</span>
                    </div>
                    <div className="signal-symbol">{signal.symbol}</div>
                    <div className="signal-details">
                      <div className="detail-row"><span>Entry:</span><span className="value">${signal.entry}</span></div>
                      <div className="detail-row"><span>Stop Loss:</span><span className="value sl">${signal.sl}</span></div>
                      <div className="detail-row"><span>Take Profit:</span><span className="value tp">${signal.tp1}</span></div>
                      <div className="detail-row"><span>Confidence:</span><span className="value">{signal.confidence}%</span></div>
                    </div>
                    <div className="signal-time">{getTimeAgo(signal.timestamp)}</div>
                    {algoEnabled && <div className="auto-trade-badge">🤖 Auto-Trading</div>}
                  </div>
                )) : (
                  <div className="no-data"><span>📡</span><p>No signals yet. Waiting for TradingView signals...</p></div>
                )}
              </div>
            </div>
          )}

          {/* Delta Exchange Tab */}
          {activeTab === 'delta' && (
            <div className="delta-section">
              <div className="section-header"><h2>💰 Delta Exchange Integration</h2></div>
              
              {/* API Configuration */}
              <div className="config-card">
                <h3>🔑 API Configuration</h3>
                <div className="form-group">
                  <label>API Key</label>
                  <input type="text" value={deltaApiKey} onChange={(e) => setDeltaApiKey(e.target.value)} placeholder="Enter your Delta Exchange API Key" />
                </div>
                <div className="form-group">
                  <label>API Secret</label>
                  <input type="password" value={deltaApiSecret} onChange={(e) => setDeltaApiSecret(e.target.value)} placeholder="Enter your Delta Exchange API Secret" />
                </div>
                <div className="form-group checkbox">
                  <label>
                    <input type="checkbox" checked={deltaTestnet} onChange={(e) => setDeltaTestnet(e.target.checked)} />
                    Use Testnet (Recommended for testing)
                  </label>
                </div>
                <div className="button-group">
                  <button className="btn btn-secondary" onClick={testDeltaConnection} disabled={isTestingConnection}>
                    {isTestingConnection ? '⏳ Testing...' : '🔗 Test Connection'}
                  </button>
                  <button className="btn btn-primary" onClick={saveDeltaConfig} disabled={isSavingConfig}>
                    {isSavingConfig ? '⏳ Saving...' : '💾 Save Configuration'}
                  </button>
                </div>
              </div>

              {/* Algo Trading Toggle */}
              <div className="config-card algo-card">
                <h3>🤖 Auto Trading</h3>
                <p>When enabled, signals will automatically execute trades on Delta Exchange</p>
                <div className={`algo-toggle ${algoEnabled ? 'enabled' : 'disabled'}`}>
                  <button onClick={toggleAlgoTrading} disabled={!deltaConnected}>
                    {algoEnabled ? '🟢 ALGO ENABLED - Click to Disable' : '🔴 ALGO DISABLED - Click to Enable'}
                  </button>
                  {!deltaConnected && <span className="warning">⚠️ Connect Delta Exchange first</span>}
                </div>
              </div>

              {/* Balance Display */}
              {deltaConnected && deltaBalance.length > 0 && (
                <div className="config-card">
                  <h3>💵 Account Balance</h3>
                  <div className="balance-grid">
                    {deltaBalance.map((bal, index) => (
                      <div key={index} className="balance-item">
                        <span className="asset">{bal.asset_symbol || bal.asset || 'USDT'}</span>
                        <span className="amount">{parseFloat(bal.available_balance || bal.balance || 0).toFixed(4)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positions Display */}
              {deltaConnected && deltaPositions.length > 0 && (
                <div className="config-card">
                  <h3>📊 Open Positions</h3>
                  <div className="positions-list">
                    {deltaPositions.map((pos, index) => (
                      <div key={index} className="position-item">
                        <span className="symbol">{pos.product_symbol || pos.symbol}</span>
                        <span className={`side ${pos.side}`}>{pos.side?.toUpperCase()}</span>
                        <span className="size">{pos.size}</span>
                        <span className="pnl">{pos.realized_pnl || pos.pnl || '0.00'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="orders-section">
              <div className="section-header">
                <h2>📋 My Trade History</h2>
                <button className="refresh-btn" onClick={loadOrders}>🔄 Refresh</button>
              </div>
              
              {userOrders.length > 0 ? (
                <div className="orders-table">
                  <div className="table-header">
                    <span>Symbol</span><span>Side</span><span>Size</span><span>Price</span><span>Status</span><span>Time</span>
                  </div>
                  {userOrders.map((order, index) => (
                    <div key={index} className="table-row">
                      <span className="symbol">{order.symbol}</span>
                      <span className={`side ${order.side}`}>{order.side?.toUpperCase()}</span>
                      <span>{order.size}</span>
                      <span>${order.price}</span>
                      <span className={`status ${order.status}`}>{order.status}</span>
                      <span>{getTimeAgo(order.executedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data"><span>📋</span><p>No trades executed yet. Enable algo trading to start!</p></div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="settings-section">
              <div className="section-header"><h2>⚙️ Account Settings</h2></div>
              
              <div className="config-card">
                <h3>👤 Profile Information</h3>
                <div className="profile-info">
                  <div className="info-row"><span>Name:</span><span>{user?.name}</span></div>
                  <div className="info-row"><span>Email:</span><span>{user?.email}</span></div>
                  <div className="info-row"><span>Role:</span><span>{user?.role}</span></div>
                  <div className="info-row"><span>Member Since:</span><span>{new Date(user?.createdAt).toLocaleDateString()}</span></div>
                </div>
              </div>

              <div className="config-card">
                <h3>📊 Trading Status</h3>
                <div className="status-grid">
                  <div className="status-item">
                    <span className="label">Delta Exchange</span>
                    <span className={`value ${deltaConnected ? 'connected' : 'disconnected'}`}>
                      {deltaConnected ? '✅ Connected' : '❌ Not Connected'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="label">Algo Trading</span>
                    <span className={`value ${algoEnabled ? 'enabled' : 'disabled'}`}>
                      {algoEnabled ? '🟢 Enabled' : '🔴 Disabled'}
                    </span>
                  </div>
                  <div className="status-item">
                    <span className="label">Network</span>
                    <span className="value">{deltaTestnet ? '🧪 Testnet' : '🌐 Mainnet'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="user-footer">
          <p>🤖 AI Trading Bot v2.0 | Connected to Delta Exchange | Last Updated: {lastUpdated}</p>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
