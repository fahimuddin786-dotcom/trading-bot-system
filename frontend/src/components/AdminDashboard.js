// src/components/AdminDashboard.js - COMPLETE UPDATED VERSION WITH USER MANAGEMENT
import React, { useState, useEffect, useRef } from 'react';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendStatus, setBackendStatus] = useState(false);
  const [wsStatus, setWsStatus] = useState(false);
  const [tradingStatus, setTradingStatus] = useState('Checking...');
  
  // User Management States
  const [allUsers, setAllUsers] = useState([]);
  const [algoUsersCount, setAlgoUsersCount] = useState(0);
  const [allOrders, setAllOrders] = useState([]);
  
  // TradingView Signal Data
  const [tradingViewSignals, setTradingViewSignals] = useState([]);
  const [lastSignalDetails, setLastSignalDetails] = useState({
    symbol: 'N/A',
    signal: 'N/A',
    type: 'LST', // Default type
    price: 'N/A',
    position: 'N/A',
    timeframe: 'N/A',
    entry: 'N/A',
    sl: 'N/A',
    tp1: 'N/A',
    tp2: 'N/A',
    tp3: 'N/A',
    confidence: 'N/A',
    timestamp: 'Never',
    conditions: {},
    source: 'TradingView'
  });
  
  // Start with Hybrid mode as default (RECOMMENDED FIX)
  const [connectionMode, setConnectionMode] = useState('hybrid');
  
  const [ethPrice, setEthPrice] = useState('$0.00');
  const [btcPrice, setBtcPrice] = useState('$0.00');
  const [solPrice, setSolPrice] = useState('$0.00');
  const [ethChange, setEthChange] = useState('0.00%');
  const [btcChange, setBtcChange] = useState('0.00%');
  const [solChange, setSolChange] = useState('0.00%');
  const [lastPriceUpdate, setLastPriceUpdate] = useState('--:--:--');
  const [priceSource, setPriceSource] = useState('Checking...');
  
  const [logs, setLogs] = useState([
    { time: '00:00:00', message: 'System initialized. Waiting for connections...' }
  ]);
  const [realTimeNotifications, setRealTimeNotifications] = useState([]);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);
  const currentPricesRef = useRef({});
  const lastNotificationRef = useRef(Date.now());
  const priceUpdateRef = useRef(null);
  const dataRefreshRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const wsConnectionAttemptRef = useRef(0);
  
  // ==================== CONFIGURATION FOR PORT 80 ====================
  const HOSTNAME = window.location.hostname;
  const IS_LOCAL = HOSTNAME === 'localhost' || HOSTNAME === '127.0.0.1';
  const CURRENT_ORIGIN = window.location.origin;
  
  // Qoder Environment Detection
  const IS_QODER = HOSTNAME.includes('qoder.io') || HOSTNAME.includes('qoder.app');
  
  const getBackendBaseUrl = () => {
    if (IS_LOCAL) return 'http://localhost:8080';
    if (IS_QODER) {
      // In Qoder, ports are often mapped to subdomains like xxx-8080.qoder.app
      if (HOSTNAME.includes('-3000.')) {
        return CURRENT_ORIGIN.replace('-3000.', '-8080.');
      }
    }
    return CURRENT_ORIGIN;
  };

  const CONFIG = {
    LOCAL: {
      BACKEND_URL: getBackendBaseUrl(),
      WS_URL: getBackendBaseUrl().replace('http', 'ws'),
      NAME: 'Local Server (8080)',
      COLOR: '#3182ce'
    },
    ONLINE: {
      BACKEND_URL: CURRENT_ORIGIN,
      WS_URL: CURRENT_ORIGIN.replace('http', 'ws'),
      NAME: 'Cloud Server',
      COLOR: '#38a169'
    },
    HYBRID: {
      BACKEND_URL: 'http://localhost:8080',
      WS_URL: CURRENT_ORIGIN.replace('http', 'ws'),
      NAME: 'Hybrid Mode',
      DESCRIPTION: 'Local HTTP + Remote WebSocket',
      COLOR: '#d69e2e'
    },
    ADMIN_TOKEN: 'admin123',
    AUTO_RECONNECT: true,
    HEARTBEAT_INTERVAL: 30000,
    LOG_RETENTION: 1000,
    PRICE_UPDATE_INTERVAL: 10000,
    DATA_REFRESH_INTERVAL: 60000,
    REAL_SIGNALS_ONLY: true,
    BINANCE_API: true,
    NOTIFICATION_COOLDOWN: 5000,
    WS_RECONNECT_DELAY: 5000,
    REQUEST_TIMEOUT: 15000,
    MAX_WS_RECONNECT_ATTEMPTS: 5
  };

  // ==================== CONNECTION HELPERS ====================
  const getBackendUrl = () => {
    switch(connectionMode) {
      case 'local': return CONFIG.LOCAL.BACKEND_URL;
      case 'online': return CONFIG.ONLINE.BACKEND_URL;
      case 'hybrid': return CONFIG.HYBRID.BACKEND_URL;
      default: return CONFIG.HYBRID.BACKEND_URL;
    }
  };

  const getWsUrl = () => {
    switch(connectionMode) {
      case 'local': return CONFIG.LOCAL.WS_URL;
      case 'online': return CONFIG.ONLINE.WS_URL;
      case 'hybrid': return CONFIG.HYBRID.WS_URL;
      default: return CONFIG.HYBRID.WS_URL;
    }
  };

  const getConnectionName = () => {
    switch(connectionMode) {
      case 'local': return CONFIG.LOCAL.NAME;
      case 'online': return CONFIG.ONLINE.NAME;
      case 'hybrid': return CONFIG.HYBRID.NAME;
      default: return CONFIG.HYBRID.NAME;
    }
  };

  const getConnectionColor = () => {
    switch(connectionMode) {
      case 'local': return CONFIG.LOCAL.COLOR;
      case 'online': return CONFIG.ONLINE.COLOR;
      case 'hybrid': return CONFIG.HYBRID.COLOR;
      default: return CONFIG.HYBRID.COLOR;
    }
  };

  // ==================== EFFECTS ====================
  useEffect(() => {
    logMessage(`🚀 Trading Bot Dashboard Initializing (${getConnectionName()})...`);
    logMessage(`🔗 Connection Mode: ${connectionMode.toUpperCase()}`);
    logMessage(`📡 HTTP: ${getBackendUrl()}`);
    logMessage(`🔌 WebSocket: ${getWsUrl()}`);
    logMessage('💰 Binance API Integration: ENABLED');
    
    checkBackendStatus();
    setupWebSocket();
    setupRealTimePriceUpdates();
    requestNotificationPermission();
    loadAllUsers();
    loadAllOrders();
    
    // Initial data load after 2 seconds
    const initialLoadTimer = setTimeout(() => {
      getTradingViewSignals();
      updateRealTimePrices();
    }, 2000);
    
    // Auto-refresh every 1 minute
    dataRefreshRef.current = setInterval(() => {
      if (backendStatus) {
        getTradingViewSignals();
        loadAllUsers();
        loadAllOrders();
      }
    }, CONFIG.DATA_REFRESH_INTERVAL);
    
    // Cleanup function
    return () => {
      clearTimeout(initialLoadTimer);
      clearInterval(dataRefreshRef.current);
      if (priceUpdateRef.current) {
        clearInterval(priceUpdateRef.current);
        priceUpdateRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connectionMode]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // ==================== USER MANAGEMENT FUNCTIONS ====================
  const loadAllUsers = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.users) {
          setAllUsers(data.users);
          setAlgoUsersCount(data.algoEnabled || 0);
          logMessage(`👥 Loaded ${data.users.length} users, ${data.algoEnabled} with algo enabled`);
        }
      } else {
        logMessage(`❌ Failed to load users: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      logMessage(`❌ Error loading users: ${error.message}`);
    }
  };

  const loadAllOrders = async () => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.orders) {
          setAllOrders(data.orders);
          logMessage(`📋 Loaded ${data.orders.length} orders`);
        }
      } else {
        logMessage(`❌ Failed to load orders: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      logMessage(`❌ Error loading orders: ${error.message}`);
    }
  };

  // ==================== SIGNAL FORWARDING FUNCTIONS ====================
  const forwardSignalToUsers = async (signalData) => {
    try {
      logMessage(`🎯 Forwarding signal to ${algoUsersCount} users with algo enabled...`);
      
      const response = await fetch(`${getBackendUrl()}/api/admin/forward-signal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(signalData)
      });
      
      if (response.ok) {
        const data = await response.json();
        logMessage(`✅ Signal forwarded: ${data.executed}/${data.total} users`);
        showNotification('Signal Forwarded', `${data.executed} users received signal`, 'success');
      } else {
        logMessage(`❌ Signal forwarding failed: ${response.status}`);
        showNotification('Forward Failed', 'Signal forwarding failed', 'error');
      }
    } catch (error) {
      console.error('Error forwarding signal:', error);
      logMessage(`❌ Error forwarding signal: ${error.message}`);
      showNotification('Forward Failed', 'Error occurred while forwarding', 'error');
    }
  };
  const logMessage = (message) => {
    const now = new Date();
    const time = '[' + now.getHours().toString().padStart(2, '0') + ':' + 
                 now.getMinutes().toString().padStart(2, '0') + ':' + 
                 now.getSeconds().toString().padStart(2, '0') + ']';
    
    const newLog = { time, message };
    setLogs(prevLogs => [...prevLogs, newLog].slice(-CONFIG.LOG_RETENTION));
    
    console.log(`[AdminDashboard] ${message}`);
  };

  const showNotification = (title, message, type = 'info') => {
    const now = Date.now();
    if (now - lastNotificationRef.current < CONFIG.NOTIFICATION_COOLDOWN) {
      console.log('Notification skipped due to cooldown');
      return;
    }
    
    lastNotificationRef.current = now;
    
    setNotification({ show: true, message: `${title}: ${message}`, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 5000);
    
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { 
          body: message,
          icon: type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'
        });
      } catch (error) {
        console.error('Notification error:', error);
      }
    }
  };

  const showRealTimeNotification = (signalData, signalType = 'LST') => {
    const now = Date.now();
    if (now - lastNotificationRef.current < CONFIG.NOTIFICATION_COOLDOWN) {
      return;
    }
    
    lastNotificationRef.current = now;
    
    // Determine icon and color based on signal type
    const signalIcon = signalType === 'PURE' ? '🎯' : signalData.signal === 'BUY' ? '🚀' : '🐻';
    const signalColor = signalType === 'PURE' ? '#FFD700' : signalData.signal === 'BUY' ? '#00ff80' : '#ff4757';
    
    const newNotification = {
      id: Date.now(),
      ...signalData,
      signalType: signalType,
      timestamp: new Date(),
      alertStatus: {
        telegram: '📱 Sent',
        mobile: '📲 Sent', 
        browser: '🌐 Sent'
      }
    };
    
    setRealTimeNotifications(prev => [newNotification, ...prev].slice(0, 5));
    
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification(
          `${signalIcon} ${signalType} ${signalData.signal} ${signalData.symbol}`,
          {
            body: `Entry: $${signalData.entry} | Current: $${signalData.currentMarketPrice || 'N/A'}`,
            icon: signalData.signal === 'BUY' ? '🟢' : '🔴',
            tag: signalData.id,
            requireInteraction: true,
            data: signalData
          }
        );
        
        notification.onclick = () => {
          window.open(getBackendUrl(), '_blank');
        };
      } catch (error) {
        console.error('Browser notification error:', error);
      }
    }
    
    logMessage(`${signalIcon} ${signalType} Signal: ${signalData.symbol} @ $${signalData.entry}`);
  };

  // ==================== FIXED BACKEND CONNECTION ====================
  const checkBackendStatus = async () => {
    const url = getBackendUrl();
    logMessage(`🔍 Checking backend at ${url}/health...`);
    
    try {
      const response = await fetch(`${url}/health`, {
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackendStatus(true);
        logMessage(`✅ Backend connected: ${data.status} | Uptime: ${Math.floor(data.uptime)}s`);
        
        const mode = data.features && data.features.includes('binance-prices') 
          ? 'LIVE TRADING (Binance)' 
          : 'DEMO MODE';
        setTradingStatus(mode);
        
        if (data.currentPrices && data.currentPrices.source) {
          const source = data.currentPrices.source === 'binance' ? '💰 Binance API' : 
                        data.currentPrices.source === 'simulated' ? '🔄 Simulated' : 
                        data.currentPrices.source === 'coingecko' ? '🦎 CoinGecko' : '📡 Unknown';
          setPriceSource(source);
        }
        
        // Update prices from backend health check
        if (data.currentPrices) {
          updatePriceDisplay('ETHUSDT', data.currentPrices.ETHUSDT || 0);
          updatePriceDisplay('BTCUSDT', data.currentPrices.BTCUSDT || 0);
          updatePriceDisplay('SOLUSDT', data.currentPrices.SOLUSDT || 0);
          
          const now = new Date();
          setLastPriceUpdate(now.toLocaleTimeString('en-US', { hour12: false }));
        }
        
      } else {
        setBackendStatus(false);
        logMessage(`❌ Backend returned status: ${response.status}`);
      }
    } catch (error) {
      setBackendStatus(false);
      logMessage(`❌ Failed to connect to backend: ${error.message}`);
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        logMessage('⏰ Connection timeout - Backend might be slow to respond');
      }
    }
  };

  // ==================== FIXED WEBSOCKET FUNCTIONS ====================
  const setupWebSocket = () => {
    // Reset connection attempt counter if successful
    wsConnectionAttemptRef.current = 0;
    
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Close existing WebSocket if present
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || 
            wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.onclose = null;
          wsRef.current.close();
        }
      } catch (error) {
        console.error('Error closing previous WebSocket:', error);
      }
      wsRef.current = null;
    }
    
    const wsUrl = getWsUrl();
    logMessage(`🔌 Connecting to WebSocket: ${wsUrl}`);
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        setWsStatus(true);
        wsConnectionAttemptRef.current = 0; // Reset counter on success
        logMessage('✅ WebSocket connected');
        subscribeToRealSignals();
        
        // Send initial ping after connection is stable
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            try {
              wsRef.current.send(JSON.stringify({ 
                type: 'PING',
                timestamp: new Date().toISOString()
              }));
            } catch (error) {
              logMessage(`❌ Error sending PING: ${error.message}`);
            }
          }
        }, 1000);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          logMessage('❌ WebSocket message parse error: ' + error.message);
        }
      };
      
      wsRef.current.onclose = (event) => {
        setWsStatus(false);
        logMessage(`❌ WebSocket disconnected: Code ${event.code}, Reason: ${event.reason || 'Unknown'}`);
        
        if (CONFIG.AUTO_RECONNECT && wsConnectionAttemptRef.current < CONFIG.MAX_WS_RECONNECT_ATTEMPTS) {
          wsConnectionAttemptRef.current += 1;
          const delay = CONFIG.WS_RECONNECT_DELAY * wsConnectionAttemptRef.current;
          logMessage(`🔄 Attempt ${wsConnectionAttemptRef.current}/${CONFIG.MAX_WS_RECONNECT_ATTEMPTS} in ${delay/1000} seconds...`);
          reconnectTimeoutRef.current = setTimeout(setupWebSocket, delay);
        } else if (wsConnectionAttemptRef.current >= CONFIG.MAX_WS_RECONNECT_ATTEMPTS) {
          logMessage('❌ Max WebSocket reconnection attempts reached. Manual reconnect required.');
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        logMessage('❌ WebSocket connection error');
      };
      
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      logMessage(`❌ Failed to create WebSocket: ${error.message}`);
      
      if (CONFIG.AUTO_RECONNECT && wsConnectionAttemptRef.current < CONFIG.MAX_WS_RECONNECT_ATTEMPTS) {
        wsConnectionAttemptRef.current += 1;
        const delay = CONFIG.WS_RECONNECT_DELAY * wsConnectionAttemptRef.current;
        reconnectTimeoutRef.current = setTimeout(setupWebSocket, delay);
      }
    }
  };

  const handleWebSocketMessage = (data) => {
    switch(data.type) {
      case 'NEW_SIGNAL':
        if (!data.data.demo && data.data.source !== 'test') {
          handleRealTimeSignal(data.data);
        }
        break;
        
      case 'PRICE_UPDATE':
        if (data.prices) {
          if (data.prices.ETHUSDT) updatePriceDisplay('ETHUSDT', data.prices.ETHUSDT);
          if (data.prices.BTCUSDT) updatePriceDisplay('BTCUSDT', data.prices.BTCUSDT);
          if (data.prices.SOLUSDT) updatePriceDisplay('SOLUSDT', data.prices.SOLUSDT);
          
          const now = new Date();
          setLastPriceUpdate(now.toLocaleTimeString('en-US', { hour12: false }));
          
          if (data.source) {
            const sourceText = data.source === 'binance' ? '💰 Binance API' : 
                             data.source === 'simulated' ? '🔄 Simulated' : 
                             data.source === 'coingecko' ? '🦎 CoinGecko' :
                             data.source === 'cache-fallback' ? '💾 Cache' : data.source;
            setPriceSource(sourceText);
          }
        }
        break;
        
      case 'WELCOME':
        logMessage(`🌐 WebSocket: ${data.message}`);
        break;
        
      case 'PONG':
        logMessage(`💓 WebSocket heartbeat received`);
        break;
        
      case 'HEARTBEAT':
        // Just acknowledge, no log needed
        break;
        
      case 'SHUTDOWN':
        logMessage('⚠️ Server is shutting down...');
        showNotification('Server Shutdown', 'Server is shutting down', 'warning');
        break;
        
      case 'SUBSCRIBE_CONFIRMED':
        logMessage('✅ Subscribed to real-time signals');
        break;
    }
  };

  // ==================== REAL-TIME SIGNAL HANDLING ====================
  const handleRealTimeSignal = (signalData) => {
    // Determine signal type based on conditions
    const isPureSignal = signalData.type === 'PURE_SIGNAL' || 
                        (signalData.conditions && 
                         signalData.conditions.lst && 
                         signalData.conditions.mtf && 
                         signalData.conditions.volume && 
                         signalData.conditions.ai && 
                         signalData.conditions.level);
    
    const signalType = isPureSignal ? 'PURE' : 'LST';
    
    const timeframe = signalData.timeframe || getRandomTimeframe();
    
    // Update last signal details with TYPE information
    setLastSignalDetails({
      symbol: signalData.symbol || 'N/A',
      signal: signalData.signal || 'N/A',
      type: signalType,
      price: `$${signalData.entry || 'N/A'}`,
      position: signalData.signal === 'BUY' ? 'Bull 🐂' : 'Bear 🐻',
      timeframe: timeframe,
      entry: `$${signalData.entry || 'N/A'}`,
      sl: `$${signalData.sl || 'N/A'}`,
      tp1: `$${signalData.tp1 || 'N/A'}`,
      tp2: `$${signalData.tp2 || 'N/A'}`,
      tp3: `$${signalData.tp3 || 'N/A'}`,
      confidence: `${signalData.confidence || 'N/A'}%`,
      timestamp: new Date().toLocaleTimeString(),
      conditions: signalData.conditions || {},
      source: signalData.source || 'TradingView'
    });
    
    showRealTimeNotification(signalData, signalType);
    
    // Add to trading view signals list with TYPE
    const newSignal = {
      id: Date.now(),
      symbol: signalData.symbol || 'N/A',
      signal: signalData.signal || 'N/A',
      type: signalType,
      price: `$${signalData.entry || 'N/A'}`,
      position: signalData.signal === 'BUY' ? 'Bull 🐂' : 'Bear 🐻',
      timeframe: timeframe,
      entry: `$${signalData.entry || 'N/A'}`,
      sl: `$${signalData.sl || 'N/A'}`,
      tp1: `$${signalData.tp1 || 'N/A'}`,
      tp2: `$${signalData.tp2 || 'N/A'}`,
      tp3: `$${signalData.tp3 || 'N/A'}`,
      confidence: `${signalData.confidence || 'N/A'}%`,
      timestamp: new Date().toLocaleTimeString(),
      status: 'active',
      conditions: signalData.conditions || {},
      source: signalData.source || 'TradingView'
    };
    
    setTradingViewSignals(prev => [newSignal, ...prev].slice(0, 10));
    
    // Automatically forward to users with algo enabled
    if (algoUsersCount > 0) {
      setTimeout(() => {
        forwardSignalToUsers(signalData);
      }, 1000); // Small delay to ensure signal is processed
    }
  };

  const getRandomTimeframe = () => {
    const timeframes = ['5M', '15M', '30M', '1H', '2H', '4H', '1D'];
    return timeframes[Math.floor(Math.random() * timeframes.length)];
  };

  const subscribeToRealSignals = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ 
          type: 'SUBSCRIBE_SIGNALS',
          timestamp: new Date().toISOString()
        }));
        logMessage('📡 Subscribed to REAL trading signals');
      } catch (error) {
        logMessage(`❌ Failed to subscribe to signals: ${error.message}`);
      }
    } else {
      logMessage('⚠️ WebSocket not ready for subscription');
    }
  };

  // ==================== PRICE FUNCTIONS ====================
  const getSimulatedPrices = () => {
    const simulatedPrices = {
      ETHUSDT: 2500 + (Math.random() * 50 - 25),
      BTCUSDT: 45000 + (Math.random() * 500 - 250),
      SOLUSDT: 100 + (Math.random() * 5 - 2.5)
    };
    
    updatePriceDisplay('ETHUSDT', simulatedPrices.ETHUSDT);
    updatePriceDisplay('BTCUSDT', simulatedPrices.BTCUSDT);
    updatePriceDisplay('SOLUSDT', simulatedPrices.SOLUSDT);
    
    const now = new Date();
    setLastPriceUpdate(now.toLocaleTimeString('en-US', { hour12: false }) + ' (SIMULATED)');
    setPriceSource('🔄 Simulated (Fallback)');
  };

  const updateRealTimePrices = async () => {
    if (!backendStatus) {
      logMessage('⚠️ Skipping price update - Backend not connected');
      return;
    }
    
    try {
      const url = `${getBackendUrl()}/prices`;
      logMessage(`🔄 Fetching prices from: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.prices) {
        updatePriceDisplay('ETHUSDT', data.prices.ETHUSDT || 0);
        updatePriceDisplay('BTCUSDT', data.prices.BTCUSDT || 0);
        updatePriceDisplay('SOLUSDT', data.prices.SOLUSDT || 0);
        
        const now = new Date();
        setLastPriceUpdate(now.toLocaleTimeString('en-US', { hour12: false }));
        
        if (data.source) {
          const sourceText = data.source === 'binance' ? '💰 Binance API' : 
                           data.source === 'simulated' ? '🔄 Simulated' : 
                           data.source === 'coingecko' ? '🦎 CoinGecko' :
                           data.source === 'cache-fallback' ? '💾 Cache' : data.source;
          setPriceSource(sourceText);
        }
        
        logMessage(`📈 Prices updated from ${data.source || 'unknown'}: ETH=$${data.prices.ETHUSDT}`);
      } else {
        logMessage('⚠️ Price data missing success flag or prices');
        getSimulatedPrices();
      }
      
    } catch (error) {
      console.error('❌ Error fetching prices:', error.message);
      logMessage(`❌ Price fetch failed: ${error.message}`);
      getSimulatedPrices();
    }
  };

  const updatePriceDisplay = (symbol, newPrice) => {
    if (typeof newPrice !== 'number' || isNaN(newPrice)) {
      console.warn(`Invalid price for ${symbol}:`, newPrice);
      return;
    }
    
    const symbolKey = symbol.replace('USDT', '').toLowerCase();
    const oldPrice = currentPricesRef.current[symbol] || newPrice;
    
    currentPricesRef.current[symbol] = newPrice;
    
    let formattedPrice;
    if (symbol.includes('BTC')) {
      formattedPrice = newPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else if (symbol.includes('ETH')) {
      formattedPrice = newPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      formattedPrice = newPrice.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    
    const change = ((newPrice - oldPrice) / oldPrice * 100);
    const changeText = change >= 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`;
    
    switch(symbolKey) {
      case 'eth':
        setEthPrice(`$${formattedPrice}`);
        setEthChange(changeText);
        break;
      case 'btc':
        setBtcPrice(`$${formattedPrice}`);
        setBtcChange(changeText);
        break;
      case 'sol':
        setSolPrice(`$${formattedPrice}`);
        setSolChange(changeText);
        break;
    }
  };

  const setupRealTimePriceUpdates = () => {
    updateRealTimePrices();
    
    if (priceUpdateRef.current) {
      clearInterval(priceUpdateRef.current);
    }
    
    priceUpdateRef.current = setInterval(() => {
      if (backendStatus) {
        updateRealTimePrices();
      }
    }, CONFIG.PRICE_UPDATE_INTERVAL);
  };

  // ==================== DATA FETCHING ====================
  const getTradingViewSignals = async () => {
    if (!backendStatus) {
      logMessage('⚠️ Skipping signals fetch - Backend not connected');
      return;
    }
    
    try {
      const response = await fetch(`${getBackendUrl()}/signals`, {
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update trading view signals if available
        if (data.signals && Array.isArray(data.signals)) {
          const formattedSignals = data.signals.slice(-10).map(signal => {
            const isPureSignal = signal.type === 'PURE_SIGNAL' || 
                                (signal.conditions && 
                                 signal.conditions.lst && 
                                 signal.conditions.mtf && 
                                 signal.conditions.volume && 
                                 signal.conditions.ai && 
                                 signal.conditions.level);
            
            return {
              id: signal.id || Date.now(),
              symbol: signal.symbol || 'N/A',
              signal: signal.signal || 'N/A',
              type: isPureSignal ? 'PURE' : 'LST',
              price: `$${signal.entry || signal.currentMarketPrice || 'N/A'}`,
              position: signal.signal === 'BUY' ? 'Bull 🐂' : 'Bear 🐻',
              timeframe: signal.timeframe || getRandomTimeframe(),
              entry: `$${signal.entry || 'N/A'}`,
              sl: `$${signal.sl || 'N/A'}`,
              tp1: `$${signal.tp1 || 'N/A'}`,
              tp2: `$${signal.tp2 || 'N/A'}`,
              tp3: `$${signal.tp3 || 'N/A'}`,
              confidence: `${signal.confidence || 'N/A'}%`,
              timestamp: new Date(signal.timestamp || Date.now()).toLocaleTimeString(),
              status: signal.status || 'active',
              conditions: signal.conditions || {},
              source: signal.source || 'TradingView'
            };
          });
          
          setTradingViewSignals(formattedSignals.reverse());
          
          // Update last signal details if we have signals
          if (formattedSignals.length > 0) {
            const lastSignal = formattedSignals[0];
            setLastSignalDetails({
              symbol: lastSignal.symbol,
              signal: lastSignal.signal,
              type: lastSignal.type,
              price: lastSignal.price,
              position: lastSignal.position,
              timeframe: lastSignal.timeframe,
              entry: lastSignal.entry,
              sl: lastSignal.sl,
              tp1: lastSignal.tp1,
              tp2: lastSignal.tp2,
              tp3: lastSignal.tp3,
              confidence: lastSignal.confidence,
              timestamp: lastSignal.timestamp,
              conditions: lastSignal.conditions || {},
              source: lastSignal.source || 'TradingView'
            });
          }
        }
        
        logMessage(`📡 TradingView signals loaded: ${data.count || 0}`);
      } else {
        logMessage(`❌ Signals API error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading TradingView signals:', error);
      logMessage(`❌ Failed to load TradingView signals: ${error.message}`);
    }
  };

  // ==================== NOTIFICATION PERMISSION ====================
  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      try {
        const permission = await Notification.requestPermission();
        logMessage(`🔔 Notification permission: ${permission}`);
      } catch (error) {
        console.error('Notification permission error:', error);
        logMessage(`❌ Notification permission error: ${error.message}`);
      }
    }
  };

  // ==================== ACTION FUNCTIONS ====================
  const simulateRealSignal = async () => {
    if (!backendStatus) {
      showNotification('Backend Offline', 'Cannot simulate signal - backend is offline', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${getBackendUrl()}/webhook/test`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        showNotification('REAL Signal Simulated', 'Test signal executed with real price', 'success');
        logMessage('🎯 REAL signal simulated');
        
        // Refresh signals after test
        setTimeout(getTradingViewSignals, 1000);
      } else {
        logMessage(`❌ Signal simulation error: ${response.status}`);
      }
    } catch (error) {
      console.error('REAL signal simulation failed:', error);
      logMessage(`❌ Signal simulation failed: ${error.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Copied', 'Text copied to clipboard', 'success');
      logMessage('📋 Text copied to clipboard');
    }).catch(err => {
      console.error('Copy failed:', err);
      logMessage(`❌ Copy failed: ${err.message}`);
    });
  };

  const clearLogs = () => {
    setLogs([]);
    logMessage('🗑️ Logs cleared');
  };

  const downloadLogs = () => {
    const logText = logs.map(log => `[${log.time}] ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-bot-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logMessage('📥 Logs downloaded');
  };

  const testWebhook = async () => {
    if (!backendStatus) {
      showNotification('Backend Offline', 'Cannot test webhook - backend is offline', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${getBackendUrl()}/webhook/test`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        showNotification('Webhook Test', data.message || 'Test successful', 'success');
        logMessage('🔧 Webhook test successful');
      } else {
        logMessage(`❌ Webhook test error: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook test failed:', error);
      logMessage(`❌ Webhook test failed: ${error.message}`);
    }
  };

  const toggleConnectionMode = (newMode) => {
    setConnectionMode(newMode);
    showNotification('Connection Changed', `Now using ${getConnectionName()}`, 'info');
    logMessage(`🔄 Connection changed to: ${getConnectionName()}`);
  };

  const refreshAllData = () => {
    logMessage('🔄 Refreshing all data...');
    checkBackendStatus();
    getTradingViewSignals();
    updateRealTimePrices();
    showNotification('Data Refreshed', 'All data refreshed successfully', 'success');
  };

  const forcePriceUpdate = () => {
    logMessage('💰 Manually forcing price update...');
    updateRealTimePrices();
  };

  const testPriceAPI = async () => {
    const url = `${getBackendUrl()}/prices`;
    logMessage(`🧪 Testing Price API: ${url}`);
    
    try {
      const response = await fetch(url, { 
        headers: {
          'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (response.ok) {
        const data = await response.json();
        logMessage(`✅ Price API Test: ${data.success ? 'SUCCESS' : 'FAILED'} | Source: ${data.source}`);
        showNotification('Price API Test', `Source: ${data.source}`, 'success');
      } else {
        logMessage(`❌ Price API Test: HTTP ${response.status}`);
        showNotification('Price API Test', `Failed: HTTP ${response.status}`, 'error');
      }
    } catch (error) {
      logMessage(`❌ Price API Test Error: ${error.message}`);
      showNotification('Price API Test', `Error: ${error.message}`, 'error');
    }
  };

  const reconnectWebSocket = () => {
    logMessage('🔄 Manually reconnecting WebSocket...');
    wsConnectionAttemptRef.current = 0; // Reset counter
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setupWebSocket();
  };

  // ==================== TRADINGVIEW SIGNAL TABLE FUNCTIONS ====================
  const getSignalStatusColor = (status) => {
    switch(status.toLowerCase()) {
      case 'active': return '#10b981';
      case 'closed': return '#6b7280';
      case 'profit': return '#4ade80';
      case 'loss': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getTimeframeColor = (timeframe) => {
    if (timeframe.includes('D') || timeframe.includes('W') || timeframe.includes('M')) {
      return '#8b5cf6'; // Purple for daily/weekly/monthly
    } else if (timeframe.includes('H')) {
      return '#3b82f6'; // Blue for hourly
    } else {
      return '#06b6d4'; // Cyan for minutes
    }
  };

  const getPositionColor = (position) => {
    return position.includes('Bull') ? '#4ade80' : '#ef4444';
  };

  const getSignalTypeColor = (type) => {
    return type === 'PURE' ? '#FFD700' : '#3b82f6';
  };

  const clearAllSignals = () => {
    if (window.confirm('Are you sure you want to clear all TradingView signals?')) {
      setTradingViewSignals([]);
      showNotification('Signals Cleared', 'All TradingView signals have been cleared', 'success');
      logMessage('🗑️ All TradingView signals cleared');
    }
  };

  const exportSignals = () => {
    const signalData = tradingViewSignals.map(signal => ({
      'Signal Type': signal.type,
      'Symbol': signal.symbol,
      'Signal': signal.signal,
      'Price': signal.price,
      'Position': signal.position,
      'Timeframe': signal.timeframe,
      'Entry': signal.entry,
      'Stop Loss': signal.sl,
      'Take Profit 1': signal.tp1,
      'Take Profit 2': signal.tp2 || 'N/A',
      'Take Profit 3': signal.tp3 || 'N/A',
      'Confidence': signal.confidence,
      'Timestamp': signal.timestamp,
      'Status': signal.status,
      'Source': signal.source
    }));

    const csvContent = [
      Object.keys(signalData[0] || {}).join(','),
      ...signalData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tradingview-signals-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Signals Exported', 'TradingView signals exported to CSV', 'success');
    logMessage('📊 TradingView signals exported to CSV');
  };

  // ==================== RENDER ====================
  return (
    <div className="admin-dashboard">
      {/* Real-time Notifications */}
      {realTimeNotifications.length > 0 && (
        <div className="real-time-notification">
          {realTimeNotifications.map(notification => (
            <div key={notification.id} className="signal-notification" 
                 style={{ borderLeftColor: notification.signalType === 'PURE' ? '#FFD700' : notification.signal === 'BUY' ? '#00ff80' : '#ff4757' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1.1em', color: notification.signalType === 'PURE' ? '#FFD700' : '#ffffff' }}>
                    {notification.signalType === 'PURE' ? '🎯' : notification.signal === 'BUY' ? '🟢' : '🔴'} {notification.signalType} {notification.signal} SIGNAL
                  </strong>
                  <div style={{ color: '#aaa', fontSize: '0.9em', marginTop: '5px' }}>
                    {notification.symbol} | Confidence: {notification.confidence || 75}%
                  </div>
                  {notification.alertStatus && (
                    <div style={{ marginTop: '8px', fontSize: '0.8em' }}>
                      <span style={{ marginRight: '10px', color: '#0088cc' }}>📱 {notification.alertStatus.telegram}</span>
                      <span style={{ marginRight: '10px', color: '#00ff80' }}>📲 {notification.alertStatus.mobile}</span>
                      <span style={{ color: '#3182ce' }}>🌐 {notification.alertStatus.browser}</span>
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: notification.signalType === 'PURE' ? '#FFD700' : notification.signal === 'BUY' ? '#00ff80' : '#ff4757' }}>
                    ${parseFloat(notification.entry || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.8em', color: '#666' }}>
                    {notification.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`notification ${notification.type} show`}>
          {notification.message}
        </div>
      )}

      {/* Main Container */}
      <div className="admin-container">
        {/* Header */}
        <div className="header">
          <h1>🤖 Trading Bot Dashboard - PORT 8080</h1>
          <p>Real-time trading system with TradingView integration | Status: {backendStatus ? '✅ Online' : '❌ Offline'}</p>
          
          {/* Connection Mode Selector */}
          <div style={{ 
            marginTop: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: '#666', fontSize: '0.9em' }}>
              Connection Mode:
            </span>
            <button 
              className={`btn ${connectionMode === 'local' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => toggleConnectionMode('local')}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em',
                opacity: connectionMode === 'local' ? 1 : 0.7,
                borderColor: CONFIG.LOCAL.COLOR,
                color: connectionMode === 'local' ? 'white' : CONFIG.LOCAL.COLOR,
                backgroundColor: connectionMode === 'local' ? CONFIG.LOCAL.COLOR : 'transparent'
              }}
            >
              💻 Local (Port 80)
            </button>
            <button 
              className={`btn ${connectionMode === 'hybrid' ? 'btn-warning' : 'btn-outline'}`}
              onClick={() => toggleConnectionMode('hybrid')}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em',
                opacity: connectionMode === 'hybrid' ? 1 : 0.7,
                borderColor: CONFIG.HYBRID.COLOR,
                color: connectionMode === 'hybrid' ? 'white' : CONFIG.HYBRID.COLOR,
                backgroundColor: connectionMode === 'hybrid' ? CONFIG.HYBRID.COLOR : 'transparent'
              }}
            >
              🔄 Hybrid
            </button>
            <button 
              className={`btn ${connectionMode === 'online' ? 'btn-success' : 'btn-outline'}`}
              onClick={() => toggleConnectionMode('online')}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em',
                opacity: connectionMode === 'online' ? 1 : 0.7,
                borderColor: CONFIG.ONLINE.COLOR,
                color: connectionMode === 'online' ? 'white' : CONFIG.ONLINE.COLOR,
                backgroundColor: connectionMode === 'online' ? CONFIG.ONLINE.COLOR : 'transparent'
              }}
            >
              🌐 Online
            </button>
            
            <span style={{ 
              marginLeft: '10px', 
              padding: '5px 10px', 
              background: `${getConnectionColor()}20`,
              borderRadius: '4px',
              fontSize: '0.85em',
              color: getConnectionColor(),
              fontWeight: 'bold'
            }}>
              {getConnectionName()}
            </span>
            
            <button 
              className="btn btn-info"
              onClick={refreshAllData}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em',
                marginLeft: '10px'
              }}
            >
              🔄 Refresh All
            </button>
            <button 
              className="btn btn-warning"
              onClick={forcePriceUpdate}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em'
              }}
            >
              💰 Update Prices
            </button>
            <button 
              className="btn btn-secondary"
              onClick={testPriceAPI}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em'
              }}
            >
              🧪 Test API
            </button>
            <button 
              className="btn btn-success"
              onClick={reconnectWebSocket}
              style={{ 
                padding: '5px 15px',
                fontSize: '0.9em'
              }}
            >
              🔌 Reconnect WS
            </button>
          </div>
          
          {/* Connection Info */}
          <div style={{ 
            marginTop: '10px', 
            fontSize: '0.8em', 
            color: '#666',
            textAlign: 'center'
          }}>
            <div>📡 HTTP: <code>{getBackendUrl()}</code></div>
            <div>🔌 WebSocket: <code>{getWsUrl()}</code></div>
            {connectionMode === 'hybrid' && (
              <div style={{ color: CONFIG.HYBRID.COLOR, marginTop: '5px' }}>
                ⚡ Hybrid Mode: Local HTTP + Remote WebSocket
              </div>
            )}
          </div>
        </div>
        
        {/* Price Ticker */}
        <div className="price-ticker">
          <div className="price-item">
            <span className="price-symbol">ETH/USDT:</span>
            <span className="price-value">{ethPrice}</span>
            <span className={`price-change ${ethChange.includes('+') ? 'positive' : 'negative'}`}>
              {ethChange}
            </span>
          </div>
          <div className="price-item">
            <span className="price-symbol">BTC/USDT:</span>
            <span className="price-value">{btcPrice}</span>
            <span className={`price-change ${btcChange.includes('+') ? 'positive' : 'negative'}`}>
              {btcChange}
            </span>
          </div>
          <div className="price-item">
            <span className="price-symbol">SOL/USDT:</span>
            <span className="price-value">{solPrice}</span>
            <span className={`price-change ${solChange.includes('+') ? 'positive' : 'negative'}`}>
              {solChange}
            </span>
          </div>
          <div className="price-item">
            <span>Mode: </span>
            <span style={{ 
              color: getConnectionColor(),
              fontWeight: 'bold'
            }}>
              {connectionMode === 'online' ? '🌐 Online' : 
               connectionMode === 'hybrid' ? '🔄 Hybrid' : '💻 Local (Port 80)'}
            </span>
          </div>
          <div className="price-item">
            <span>Source: </span>
            <span style={{ 
              color: priceSource.includes('Binance') ? '#38a169' : 
                     priceSource.includes('Simulated') ? '#d69e2e' : 
                     priceSource.includes('CoinGecko') ? '#3182ce' : '#666',
              fontWeight: 'bold'
            }}>
              {priceSource}
            </span>
          </div>
          <div className="price-item">
            <span>Last Update: </span>
            <span>{lastPriceUpdate}</span>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-item">
            <div className={`status-dot ${backendStatus ? 'online' : 'offline'}`}></div>
            <span>Backend: <span>{backendStatus ? 'Connected' : 'Disconnected'}</span></span>
          </div>
          <div className="status-item">
            <div className={`status-dot ${wsStatus ? 'online' : 'offline'}`}></div>
            <span>WebSocket: <span>{wsStatus ? 'Connected' : 'Disconnected'}</span></span>
          </div>
          <div className="status-item">
            <span>Trading Mode: <span style={{ 
              color: tradingStatus.includes('LIVE') ? '#38a169' : '#d69e2e',
              fontWeight: 'bold'
            }}>{tradingStatus}</span></span>
          </div>
          <div className="status-item">
            <span>Connection: <span style={{ 
              color: getConnectionColor()
            }}>{getConnectionName()}</span></span>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-container">
          <div className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Real Dashboard
          </div>
          <div className={`tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            👥 User Management
          </div>
          <div className={`tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            📋 Order Management
          </div>
          <div className={`tab ${activeTab === 'tradingview' ? 'active' : ''}`} onClick={() => setActiveTab('tradingview')}>
            📡 TradingView Signals
          </div>
          <div className={`tab ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
            📝 Logs
          </div>
          <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
            📈 Real Stats
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div id="dashboard-tab" className="tab-content active">
              <div className="card">
                <h3>📊 REAL-TIME TRADING BOT STATUS - PORT 80</h3>
                
                <div style={{ 
                  margin: '20px 0', 
                  padding: '20px', 
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  borderRadius: '12px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div>
                      <h4 style={{ color: '#94a3b8', marginBottom: '10px' }}>Server Status</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Backend:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: backendStatus ? '#4ade80' : '#ef4444'
                        }}>
                          {backendStatus ? '✅ Connected' : '❌ Disconnected'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>WebSocket:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: wsStatus ? '#4ade80' : '#ef4444'
                        }}>
                          {wsStatus ? '✅ Connected' : '❌ Disconnected'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Trading Mode:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: tradingStatus.includes('LIVE') ? '#4ade80' : '#f59e0b'
                        }}>
                          {tradingStatus}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 style={{ color: '#94a3b8', marginBottom: '10px' }}>User Statistics</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Total Users:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: '#f8fafc'
                        }}>
                          {allUsers.length}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Algo Enabled:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: algoUsersCount > 0 ? '#4ade80' : '#f59e0b'
                        }}>
                          {algoUsersCount}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Total Orders:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: '#f8fafc'
                        }}>
                          {allOrders.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#f8fafc' }}>Quick Actions</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <button className="btn btn-primary" onClick={testWebhook}>Test Webhook</button>
                    <button className="btn btn-success" onClick={simulateRealSignal}>Simulate REAL Signal</button>
                    <button className="btn btn-info" onClick={refreshAllData}>Refresh All Data</button>
                    <button className="btn btn-warning" onClick={forcePriceUpdate}>Update Prices</button>
                    <button className="btn btn-secondary" onClick={testPriceAPI}>Test Price API</button>
                    <button className="btn btn-success" onClick={reconnectWebSocket}>Reconnect WebSocket</button>
                    <button className="btn btn-purple" onClick={loadAllUsers}>Load Users</button>
                    <button className="btn btn-purple" onClick={loadAllOrders}>Load Orders</button>
                  </div>
                </div>
                
                <div style={{ marginTop: '30px', padding: '15px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#f8fafc' }}>🔗 Important Endpoints</h4>
                  <div style={{ fontSize: '0.9em', color: '#cbd5e1' }}>
                    <div><strong>Health Check:</strong> {getBackendUrl()}/health</div>
                    <div><strong>Real-time Prices:</strong> {getBackendUrl()}/prices</div>
                    <div><strong>Webhook URL:</strong> {getBackendUrl()}/webhook/tradingview</div>
                    <div><strong>Test Signal:</strong> {getBackendUrl()}/webhook/test</div>
                    <div><strong>Telegram Test:</strong> {getBackendUrl()}/telegram/test</div>
                    <div><strong>Admin Users:</strong> {getBackendUrl()}/api/admin/users</div>
                    <div><strong>Admin Orders:</strong> {getBackendUrl()}/api/admin/orders</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* TradingView Signals Tab */}
          {activeTab === 'tradingview' && (
            <div id="tradingview-tab" className="tab-content active">
              <div className="card">
                <h3>📡 TRADINGVIEW LAST SIGNAL DETAILS</h3>
                
                {/* Last Signal Summary */}
                <div style={{ 
                  margin: '20px 0', 
                  padding: '20px', 
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  borderRadius: '12px',
                  border: '1px solid #334155'
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#f8fafc' }}>📊 Last Signal Summary</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Signal Type:</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: lastSignalDetails.type === 'PURE' ? '#FFD700' : '#3b82f6'
                      }}>
                        {lastSignalDetails.type === 'PURE' ? '🎯 PURE SIGNAL' : '📡 LST SIGNAL'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Symbol:</span>
                      <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{lastSignalDetails.symbol}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Signal Type:</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: lastSignalDetails.signal === 'BUY' ? '#4ade80' : '#ef4444'
                      }}>
                        {lastSignalDetails.signal}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Price:</span>
                      <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{lastSignalDetails.price}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Position:</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: lastSignalDetails.position.includes('Bull') ? '#4ade80' : '#ef4444'
                      }}>
                        {lastSignalDetails.position}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Timeframe:</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: getTimeframeColor(lastSignalDetails.timeframe)
                      }}>
                        {lastSignalDetails.timeframe}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Entry Price:</span>
                      <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{lastSignalDetails.entry}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Stop Loss:</span>
                      <span style={{ fontWeight: 'bold', color: '#ef4444' }}>{lastSignalDetails.sl}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Take Profit 1:</span>
                      <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{lastSignalDetails.tp1}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Take Profit 2:</span>
                      <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{lastSignalDetails.tp2 || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Take Profit 3:</span>
                      <span style={{ fontWeight: 'bold', color: '#4ade80' }}>{lastSignalDetails.tp3 || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Confidence:</span>
                      <span style={{ 
                        fontWeight: 'bold', 
                        color: parseInt(lastSignalDetails.confidence) > 70 ? '#4ade80' : 
                               parseInt(lastSignalDetails.confidence) > 50 ? '#fbbf24' : '#ef4444'
                      }}>
                        {lastSignalDetails.confidence}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                      <span style={{ color: '#94a3b8' }}>Timestamp:</span>
                      <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>{lastSignalDetails.timestamp}</span>
                    </div>
                  </div>
                  
                  {/* Conditions Display */}
                  {lastSignalDetails.conditions && Object.keys(lastSignalDetails.conditions).length > 0 && (
                    <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(30, 41, 59, 0.5)', borderRadius: '8px' }}>
                      <h5 style={{ marginBottom: '10px', color: '#f8fafc' }}>✅ Conditions Met:</h5>
                      <div className="conditions-met">
                        {lastSignalDetails.conditions.lst && (
                          <span className="condition-badge">LST Strategy ✓</span>
                        )}
                        {lastSignalDetails.conditions.mtf && (
                          <span className="condition-badge">MTF Confluence ✓</span>
                        )}
                        {lastSignalDetails.conditions.volume && (
                          <span className="condition-badge">Volume Confirmation ✓</span>
                        )}
                        {lastSignalDetails.conditions.ai && (
                          <span className="condition-badge">AI Analysis ✓</span>
                        )}
                        {lastSignalDetails.conditions.level && (
                          <span className="condition-badge">Key Level ✓</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Recent Signals Table */}
                <div style={{ marginTop: '30px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h4 style={{ margin: 0 }}>📋 Recent TradingView Signals</h4>
                    <div>
                      <button className="btn btn-success" onClick={getTradingViewSignals} style={{ marginRight: '10px' }}>
                        🔄 Refresh
                      </button>
                      <button className="btn btn-secondary" onClick={exportSignals} style={{ marginRight: '10px' }}>
                        📊 Export CSV
                      </button>
                      <button className="btn btn-danger" onClick={clearAllSignals}>
                        🗑️ Clear All
                      </button>
                    </div>
                  </div>
                  
                  {tradingViewSignals.length > 0 ? (
                    <div className="signals-table-container">
                      <table className="signals-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Type</th>
                            <th>Symbol</th>
                            <th>Signal</th>
                            <th>Price</th>
                            <th>Position</th>
                            <th>Timeframe</th>
                            <th>Entry</th>
                            <th>SL</th>
                            <th>TP1</th>
                            <th>TP2</th>
                            <th>TP3</th>
                            <th>Confidence</th>
                            <th>Time</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tradingViewSignals.map((signal, index) => (
                            <tr key={signal.id}>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                              <td>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  background: signal.type === 'PURE' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                  color: signal.type === 'PURE' ? '#FFD700' : '#3b82f6',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {signal.type === 'PURE' ? '🎯 PURE' : '📡 LST'}
                                </span>
                              </td>
                              <td>
                                <span style={{ 
                                  padding: '4px 8px', 
                                  background: 'rgba(59, 130, 246, 0.1)', 
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  {signal.symbol}
                                </span>
                              </td>
                              <td>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  background: signal.signal === 'BUY' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: signal.signal === 'BUY' ? '#4ade80' : '#f87171',
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {signal.signal === 'BUY' ? '🟢' : '🔴'} {signal.signal}
                                </span>
                              </td>
                              <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{signal.price}</td>
                              <td>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  background: signal.position.includes('Bull') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: getPositionColor(signal.position),
                                  borderRadius: '4px',
                                  fontWeight: 'bold',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  {signal.position.includes('Bull') ? '🐂' : '🐻'} {signal.position}
                                </span>
                              </td>
                              <td>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  background: 'rgba(139, 92, 246, 0.1)',
                                  color: getTimeframeColor(signal.timeframe),
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  {signal.timeframe}
                                </span>
                              </td>
                              <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{signal.entry}</td>
                              <td style={{ color: '#ef4444', fontFamily: 'monospace' }}>{signal.sl}</td>
                              <td style={{ color: '#4ade80', fontFamily: 'monospace' }}>{signal.tp1}</td>
                              <td style={{ color: '#4ade80', fontFamily: 'monospace' }}>{signal.tp2 || 'N/A'}</td>
                              <td style={{ color: '#4ade80', fontFamily: 'monospace' }}>{signal.tp3 || 'N/A'}</td>
                              <td>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  background: parseInt(signal.confidence) > 70 ? 'rgba(34, 197, 94, 0.1)' : 
                                            parseInt(signal.confidence) > 50 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                  color: parseInt(signal.confidence) > 70 ? '#4ade80' : 
                                        parseInt(signal.confidence) > 50 ? '#f59e0b' : '#ef4444',
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  {signal.confidence}
                                </span>
                              </td>
                              <td style={{ fontSize: '0.9em', color: '#94a3b8' }}>{signal.timestamp}</td>
                              <td>
                                <span style={{ 
                                  padding: '4px 10px', 
                                  background: `rgba(${getSignalStatusColor(signal.status).replace('#', '').match(/.{2}/g).map(x => parseInt(x, 16)).join(', ')}, 0.1)`,
                                  color: getSignalStatusColor(signal.status),
                                  borderRadius: '4px',
                                  fontWeight: 'bold'
                                }}>
                                  {signal.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '40px', 
                      color: '#94a3b8',
                      background: 'rgba(15, 23, 42, 0.5)',
                      borderRadius: '8px',
                      border: '1px dashed #334155'
                    }}>
                      <div style={{ fontSize: '3em', marginBottom: '20px' }}>📡</div>
                      <div style={{ fontSize: '1.2em', marginBottom: '10px' }}>No TradingView signals yet</div>
                      <div style={{ marginBottom: '20px' }}>Waiting for TradingView signals to arrive...</div>
                      <button className="btn btn-primary" onClick={simulateRealSignal}>
                        🧪 Simulate Test Signal
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Timeframe Legend */}
                <div style={{ 
                  marginTop: '30px', 
                  padding: '15px', 
                  background: 'rgba(15, 23, 42, 0.5)',
                  borderRadius: '8px',
                  border: '1px solid #334155'
                }}>
                  <h5 style={{ marginBottom: '15px', color: '#f8fafc' }}>⏰ Signal Type Legend</h5>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: '#FFD700' 
                      }}></div>
                      <span style={{ fontSize: '0.9em' }}>🎯 PURE Signal (All Conditions Met)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: '#3b82f6' 
                      }}></div>
                      <span style={{ fontSize: '0.9em' }}>📡 LST Signal (LST Strategy Based)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div id="logs-tab" className="tab-content active">
              <div className="card">
                <h3>System Logs</h3>
                <div className="console-log">
                  {logs.map((log, index) => (
                    <div key={index} className="log-entry">
                      <span className="log-time">{log.time}</span>
                      <span className="log-message">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
                <div style={{ marginTop: '15px' }}>
                  <button className="btn btn-primary" onClick={clearLogs}>🗑️ Clear Logs</button>
                  <button className="btn btn-primary" onClick={downloadLogs} style={{ marginLeft: '10px' }}>
                    📥 Download Logs
                  </button>
                  <button className="btn btn-info" onClick={() => toggleConnectionMode('hybrid')} style={{ marginLeft: '10px' }}>
                    🔄 Switch to Hybrid
                  </button>
                  <button className="btn btn-success" onClick={refreshAllData} style={{ marginLeft: '10px' }}>
                    🔄 Refresh All
                  </button>
                  <button className="btn btn-warning" onClick={forcePriceUpdate} style={{ marginLeft: '10px' }}>
                    💰 Update Prices
                  </button>
                  <button className="btn btn-secondary" onClick={testPriceAPI} style={{ marginLeft: '10px' }}>
                    🧪 Test API
                  </button>
                  <button className="btn btn-success" onClick={reconnectWebSocket} style={{ marginLeft: '10px' }}>
                    🔌 Reconnect WS
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div id="stats-tab" className="tab-content active">
              <div className="card">
                <h3>📈 System Statistics</h3>
                <div style={{ 
                  margin: '20px 0', 
                  padding: '20px', 
                  background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  borderRadius: '12px',
                  border: '1px solid #334155'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div>
                      <h4 style={{ color: '#94a3b8', marginBottom: '15px' }}>Connection Statistics</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Backend Status:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: backendStatus ? '#4ade80' : '#ef4444'
                        }}>
                          {backendStatus ? '✅ Connected' : '❌ Disconnected'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>WebSocket Status:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: wsStatus ? '#4ade80' : '#ef4444'
                        }}>
                          {wsStatus ? '✅ Connected' : '❌ Disconnected'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Connection Mode:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: getConnectionColor()
                        }}>
                          {getConnectionName()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Trading Mode:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: tradingStatus.includes('LIVE') ? '#4ade80' : '#f59e0b'
                        }}>
                          {tradingStatus}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 style={{ color: '#94a3b8', marginBottom: '15px' }}>Price Statistics</h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Price Source:</span>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: priceSource.includes('Binance') ? '#4ade80' : 
                                priceSource.includes('Simulated') ? '#f59e0b' : '#60a5fa'
                        }}>
                          {priceSource}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>Last Update:</span>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{lastPriceUpdate}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>ETH/USDT:</span>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{ethPrice} {ethChange}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                        <span style={{ color: '#cbd5e1' }}>BTC/USDT:</span>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{btcPrice} {btcChange}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
                        <span style={{ color: '#cbd5e1' }}>SOL/USDT:</span>
                        <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{solPrice} {solChange}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#f8fafc' }}>Signal Statistics</h4>
                  <div style={{ 
                    padding: '15px', 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    borderRadius: '8px',
                    color: '#cbd5e1',
                    fontSize: '0.9em'
                  }}>
                    <div><strong>Total Signals:</strong> {tradingViewSignals.length}</div>
                    <div><strong>PURE Signals:</strong> {tradingViewSignals.filter(s => s.type === 'PURE').length}</div>
                    <div><strong>LST Signals:</strong> {tradingViewSignals.filter(s => s.type === 'LST').length}</div>
                    <div><strong>Last Signal Type:</strong> <span style={{ color: lastSignalDetails.type === 'PURE' ? '#FFD700' : '#3b82f6' }}>
                      {lastSignalDetails.type === 'PURE' ? '🎯 PURE' : '📡 LST'}
                    </span></div>
                    <div><strong>Last Signal:</strong> {lastSignalDetails.symbol} {lastSignalDetails.signal} @ {lastSignalDetails.price}</div>
                    <div><strong>Signal Source:</strong> {lastSignalDetails.source}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="footer">
          <p>🌐 HTTP URL: <span>{getBackendUrl()}</span></p>
          <p>🔌 WebSocket: <span>{getWsUrl()}</span></p>
          <p>💰 Price API: <span>{getBackendUrl()}/prices</span></p>
          <p>📊 Price Source: <span>{priceSource}</span></p>
          <p>📡 Last Signal: <span>{lastSignalDetails.symbol} {lastSignalDetails.signal} (<span style={{ color: lastSignalDetails.type === 'PURE' ? '#FFD700' : '#3b82f6' }}>{lastSignalDetails.type}</span>) @ {lastSignalDetails.price}</span></p>
          <p>🔐 Admin Token: <code>admin123</code> | 📊 Real Positions Only</p>
          <p style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
            Switch between: 
            <button 
              onClick={() => toggleConnectionMode('local')}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: connectionMode === 'local' ? CONFIG.LOCAL.COLOR : 'transparent',
                color: connectionMode === 'local' ? 'white' : CONFIG.LOCAL.COLOR,
                border: `1px solid ${CONFIG.LOCAL.COLOR}`,
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Local (Port 80)
            </button>
            <button 
              onClick={() => toggleConnectionMode('hybrid')}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: connectionMode === 'hybrid' ? CONFIG.HYBRID.COLOR : 'transparent',
                color: connectionMode === 'hybrid' ? 'white' : CONFIG.HYBRID.COLOR,
                border: `1px solid ${CONFIG.HYBRID.COLOR}`,
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Hybrid
            </button>
            <button 
              onClick={() => toggleConnectionMode('online')}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: connectionMode === 'online' ? CONFIG.ONLINE.COLOR : 'transparent',
                color: connectionMode === 'online' ? 'white' : CONFIG.ONLINE.COLOR,
                border: `1px solid ${CONFIG.ONLINE.COLOR}`,
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Online
            </button>
            <button 
              onClick={refreshAllData}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: '#3182ce',
                color: 'white',
                border: '1px solid #3182ce',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              🔄 Refresh All
            </button>
            <button 
              onClick={forcePriceUpdate}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: '#d69e2e',
                color: 'white',
                border: '1px solid #d69e2e',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              💰 Update Prices
            </button>
            <button 
              onClick={testPriceAPI}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: '#6b7280',
                color: 'white',
                border: '1px solid #6b7280',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              🧪 Test API
            </button>
            <button 
              onClick={reconnectWebSocket}
              style={{ 
                margin: '0 5px', 
                padding: '2px 8px', 
                fontSize: '0.8em',
                background: '#10b981',
                color: 'white',
                border: '1px solid #10b981',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              🔌 Reconnect WS
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;