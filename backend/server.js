// server.js - UNIVERSAL VERSION (LOCAL + CYCLIC.SH) - FIXED PORT CONFIG
require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const winston = require('winston');
const axios = require('axios');
const webPush = require('web-push');
const path = require('path');

// ==================== UNIVERSAL PLATFORM DETECTION ====================
const isCyclic = !!process.env.CYCLIC_URL;
const isRender = !!process.env.RENDER_EXTERNAL_URL;
const isLocal = !isCyclic && !isRender;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log('='.repeat(60));
console.log('🚀 TRADING BOT - UNIVERSAL DEPLOYMENT');
console.log('='.repeat(60));
console.log('🔍 Platform Detection:');
console.log(`   Cyclic.sh: ${isCyclic ? '✅ YES' : '❌ NO'}`);
console.log(`   Render: ${isRender ? '✅ YES' : '❌ NO'}`);
console.log(`   Local: ${isLocal ? '✅ YES' : '❌ NO'}`);
console.log(`   Environment: ${NODE_ENV}`);

// ==================== DYNAMIC URL CONFIGURATION ====================
let SERVER_URL = '';
let FRONTEND_URL = '';
let WS_URL = '';

const PUBLIC_URL = process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || process.env.NGROK_URL;

if (isCyclic || isRender) {
  // CLOUD MODE (Cyclic, Render, etc.)
  SERVER_URL = PUBLIC_URL || 'https://your-app.onrender.com';
  FRONTEND_URL = process.env.FRONTEND_URL || SERVER_URL;
  WS_URL = SERVER_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  
  console.log(`🌐 Cloud URL: ${SERVER_URL}`);
  console.log(`🔌 WebSocket URL: ${WS_URL}`);
  console.log(`💡 Mode: ONLINE (${isCyclic ? 'Cyclic' : 'Render'})`);
} else if (PUBLIC_URL) {
  // PUBLIC/NGROK MODE - Use the provided public URL
  SERVER_URL = PUBLIC_URL.replace(/\/$/, '');
  FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  WS_URL = SERVER_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  
  console.log(`🌐 Public URL: ${SERVER_URL}`);
  console.log(`💻 Frontend: ${FRONTEND_URL}`);
  console.log(`🔌 WebSocket: ${WS_URL}`);
  console.log('💡 Mode: PUBLIC (Ngrok/Tunneling)');
} else {
  // LOCAL MODE - Fixed for TradingView webhooks
  SERVER_URL = 'http://localhost:8080';
  FRONTEND_URL = 'http://localhost:3000';
  WS_URL = 'ws://localhost:8080';
  
  console.log(`🏠 Local URL: ${SERVER_URL}`);
  console.log(`💻 Frontend: ${FRONTEND_URL}`);
  console.log(`🔌 WebSocket: ${WS_URL}`);
  console.log('💡 Mode: LOCAL - Port 8080 for TradingView');
}

console.log('='.repeat(60));

// ==================== TELEGRAM CONFIG ====================
const TELEGRAM_CONFIG = {
  BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8191550715:AAG9-JpDBjOYO6JQ8-IP7JgMb6yj7PbopwQ',
  CHAT_ID: process.env.TELEGRAM_CHAT_ID || '1118349343',
  CHANNEL_ID: process.env.TELEGRAM_CHANNEL_ID || '@YourTradingSignals',
  ENABLED: process.env.TELEGRAM_ENABLED === 'true' || true
};

// Test Telegram Bot Function
async function testTelegramBot() {
  console.log('🔍 Testing Telegram Bot Configuration...');
  
  try {
    const botTest = await axios.get(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/getMe`, {
      timeout: 5000
    });
    
    console.log('✅ Bot Token Valid:', botTest.data.result.username);
    
    const testMessage = {
      chat_id: TELEGRAM_CONFIG.CHAT_ID,
      text: '🤖 *Trading Bot Connected Successfully!*\n\nServer is now ready to receive trading signals.',
      parse_mode: 'Markdown'
    };
    
    const sendTest = await axios.post(
      `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`,
      testMessage,
      { timeout: 5000 }
    );
    
    console.log('✅ Test Message Sent:', sendTest.data.ok);
    console.log('✅ Chat ID Verified:', TELEGRAM_CONFIG.CHAT_ID);
    
    return true;
    
  } catch (error) {
    console.error('❌ Telegram Bot Test Failed:', error.message);
    
    if (error.response) {
      const errorCode = error.response.data.error_code;
      const description = error.response.data.description;
      
      console.error('📋 Error Details:');
      console.error('  Code:', errorCode);
      console.error('  Message:', description);
      
      if (errorCode === 401) {
        console.error('  ❌ Invalid Bot Token');
        console.error('  💡 Solution: Get new token from @BotFather');
      } else if (errorCode === 400) {
        console.error('  ❌ Invalid Chat ID');
        console.error('  💡 Solution: Send a message to your bot first, then check chat_id');
      } else if (errorCode === 403) {
        console.error('  ❌ Bot blocked by user');
        console.error('  💡 Solution: Unblock the bot and start chat');
      }
    }
    
    return false;
  }
}

const EXPO_CONFIG = {
  ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN || 'YOUR_EXPO_ACCESS_TOKEN',
  ENABLED: process.env.EXPO_ENABLED === 'true' || false
};

// VAPID Keys
const VAPID_KEYS = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BB2et4Vb_vMEMsO77OLMZ3g-_FHOvZp624zxo-xeH-KaZoVGdv6khv4YGbxQpL9HbsJ1m0sp3nMpAXXg23MziwM',
  privateKey: process.env.VAPID_PRIVATE_KEY || '3w9BFMkAABT166eqdo9S_JSzqKdZaP7Zld4L2KaLeGY'
};

// Initialize web push
console.log('🔑 Initializing Web Push with VAPID keys...');
try {
  webPush.setVapidDetails(
    'mailto:trading@example.com',
    VAPID_KEYS.publicKey,
    VAPID_KEYS.privateKey
  );
  console.log('✅ Web Push initialized successfully');
} catch (error) {
  console.error('❌ Error initializing web push:', error.message);
  console.log('⚠️ Web push notifications will be disabled');
}

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

const app = express();
const server = http.createServer(app);

// ==================== UNIVERSAL CORS CONFIG ====================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:80',
  'http://localhost:3001',
  SERVER_URL,
  FRONTEND_URL,
  'https://*.cyclic.app',
  'https://*.vercel.app',
  'https://*.onrender.com'
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🔒 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

// WebSocket Server with CORS fix
const wss = new WebSocket.Server({ 
  server, 
  clientTracking: true,
  perMessageDeflate: false,
  verifyClient: (info, callback) => {
    const origin = info.origin || info.req.headers.origin;
    if (!origin || allowedOrigins.some(allowed => origin.includes(allowed) || allowed.includes('*'))) {
      callback(true);
    } else {
      console.log(`🔒 WebSocket CORS blocked: ${origin}`);
      callback(false, 403, 'Origin not allowed');
    }
  }
});

// Store active WebSocket connections
const clients = new Set();

// ==================== DATA STORAGE ====================
let webSubscriptions = [];
let mobileTokens = [];
let signals = [];

// User Database (In-memory - For production use proper DB)
let users = [
  {
    id: 'admin_001',
    name: 'Admin User',
    email: 'admin@trading.com',
    password: 'admin123', // In production, hash this!
    role: 'admin',
    createdAt: new Date().toISOString(),
    deltaConfig: null,
    algoEnabled: false
  }
];

// User sessions/tokens
let userTokens = {};

// Delta Exchange order history
let orderHistory = [];

// Connected user WebSockets (userId -> ws)
const userWebSockets = new Map();

// Price Cache - GLOBAL
let priceCache = {
  ETHUSDT: 2500.00,
  BTCUSDT: 45000.00,
  SOLUSDT: 100.00,
  lastUpdate: new Date(),
  source: 'cache',
  api: 'initial'
};

// Simple database simulation
function getDB() {
  return {
    get: (key) => {
      try {
        if (key === 'signals') return signals;
        return null;
      } catch (error) {
        return null;
      }
    },
    set: (key, value) => {
      if (key === 'signals') signals = value;
    }
  };
}

// ==================== MIDDLEWARE SETUP ====================
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parser
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.url} ${res.statusCode} ${duration}ms - Origin: ${req.headers.origin || 'none'}`);
  });
  
  next();
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.use(express.static(path.join(__dirname, 'public')));

// ==================== PRICE FUNCTIONS ====================

// Realistic simulated prices
function getRealisticPrice(symbol) {
  const basePrices = {
    'ETHUSDT': 2500 + (Math.random() * 100 - 50),
    'BTCUSDT': 45000 + (Math.random() * 1000 - 500),
    'SOLUSDT': 100 + (Math.random() * 10 - 5)
  };
  
  const price = basePrices[symbol] || 100;
  return parseFloat(price.toFixed(2));
}

// Fetch prices from reliable APIs
async function fetchMarketPrices() {
  const symbols = ['ETHUSDT', 'BTCUSDT', 'SOLUSDT'];
  const prices = {};
  let source = 'simulated';
  let apiUsed = 'none';
  
  console.log('🔄 Fetching market prices...');
  
  // 1. Try CoinGecko (Most reliable for serverless)
  try {
    console.log('🦎 Trying CoinGecko API...');
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'ethereum,bitcoin,solana',
          vs_currencies: 'usd',
          precision: 2
        },
        timeout: 3000,
        headers: {
          'User-Agent': 'TradingBot/1.0',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data?.bitcoin?.usd) {
      prices['BTCUSDT'] = response.data.bitcoin.usd;
      prices['ETHUSDT'] = response.data.ethereum?.usd || getRealisticPrice('ETHUSDT');
      prices['SOLUSDT'] = response.data.solana?.usd || getRealisticPrice('SOLUSDT');
      source = 'coingecko';
      apiUsed = 'CoinGecko';
      console.log(`✅ CoinGecko: BTC=$${prices.BTCUSDT}`);
    }
  } catch (error) {
    console.log('❌ CoinGecko failed:', error.message);
  }
  
  // 2. Try CryptoCompare
  if (!apiUsed || apiUsed === 'none') {
    try {
      console.log('📊 Trying CryptoCompare...');
      const response = await axios.get(
        'https://min-api.cryptocompare.com/data/pricemulti',
        {
          params: {
            fsyms: 'BTC,ETH,SOL',
            tsyms: 'USD'
          },
          timeout: 3000
        }
      );
      
      if (response.data?.BTC?.USD) {
        prices['BTCUSDT'] = response.data.BTC.USD;
        prices['ETHUSDT'] = response.data.ETH?.USD || getRealisticPrice('ETHUSDT');
        prices['SOLUSDT'] = response.data.SOL?.USD || getRealisticPrice('SOLUSDT');
        source = 'cryptocompare';
        apiUsed = 'CryptoCompare';
        console.log(`✅ CryptoCompare: BTC=$${prices.BTCUSDT}`);
      }
    } catch (error) {
      console.log('❌ CryptoCompare failed:', error.message);
    }
  }
  
  // 3. Try Binance as last resort
  if (!apiUsed || apiUsed === 'none') {
    try {
      console.log('💰 Trying Binance...');
      const response = await axios.get(
        'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
        { timeout: 2000 }
      );
      
      if (response.data?.price) {
        prices['BTCUSDT'] = parseFloat(response.data.price);
        prices['ETHUSDT'] = getRealisticPrice('ETHUSDT');
        prices['SOLUSDT'] = getRealisticPrice('SOLUSDT');
        source = 'binance';
        apiUsed = 'Binance';
        console.log(`✅ Binance: BTC=$${prices.BTCUSDT}`);
      }
    } catch (error) {
      console.log('❌ Binance failed:', error.message);
    }
  }
  
  // 4. Fallback to simulated prices
  if (!apiUsed || apiUsed === 'none' || !prices.BTCUSDT) {
    console.log('⚠️ All APIs failed, using realistic simulated prices');
    for (const symbol of symbols) {
      prices[symbol] = getRealisticPrice(symbol);
    }
    source = 'simulated';
    apiUsed = 'Simulated';
  }
  
  // Update global cache
  priceCache = {
    ...prices,
    lastUpdate: new Date(),
    source: source,
    api: apiUsed
  };
  
  return {
    success: true,
    prices,
    source: source,
    api: apiUsed,
    timestamp: new Date().toISOString(),
    platform: isCyclic ? 'cyclic' : 'local'
  };
}

// Get current market price for a symbol
async function getCurrentMarketPrice(symbol) {
  try {
    // First try CoinGecko
    let coinId = '';
    if (symbol.includes('BTC')) coinId = 'bitcoin';
    else if (symbol.includes('ETH')) coinId = 'ethereum';
    else if (symbol.includes('SOL')) coinId = 'solana';
    
    if (coinId) {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: { ids: coinId, vs_currencies: 'usd' },
          timeout: 2000
        }
      );
      
      if (response.data?.[coinId]?.usd) {
        return response.data[coinId].usd;
      }
    }
    
    // Try Binance
    try {
      const response = await axios.get(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { timeout: 2000 }
      );
      if (response.data?.price) {
        return parseFloat(response.data.price);
      }
    } catch (e) {
      // Binance failed
    }
    
  } catch (error) {
    console.log(`❌ Price fetch for ${symbol} failed:`, error.message);
  }
  
  // Fallback to cache or realistic price
  return priceCache[symbol] || getRealisticPrice(symbol);
}

// ==================== TELEGRAM FUNCTIONS ====================
async function sendTelegramAlert(signalData) {
  if (!TELEGRAM_CONFIG.ENABLED) {
    logger.warn('Telegram alerts are disabled');
    return { success: false, error: 'Telegram disabled' };
  }
  
  try {
    await axios.get(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/getMe`, {
      timeout: 3000
    });
  } catch (testError) {
    logger.error('❌ Telegram Bot Connection Failed:', testError.message);
    return { 
      success: false, 
      error: 'Bot connection failed',
      details: testError.message 
    };
  }
  
  try {
    // Get current market price
    let currentMarketPrice = 'N/A';
    try {
      const price = await getCurrentMarketPrice(signalData.symbol || 'BTCUSDT');
      currentMarketPrice = `$${price.toFixed(2)}`;
    } catch (priceError) {
      currentMarketPrice = priceCache[signalData.symbol] ? `$${priceCache[signalData.symbol].toFixed(2)}` : 'N/A';
    }
    
    const message = formatTelegramMessage(signalData, currentMarketPrice);
    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CONFIG.CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }, {
      timeout: 5000
    });
    
    logger.info(`📱 Telegram alert sent with price: ${currentMarketPrice}`);
    return { 
      success: true, 
      messageId: response.data.result.message_id,
      currentPrice: currentMarketPrice
    };
  } catch (error) {
    logger.error('❌ Telegram sending error:', error.message);
    
    return {
      success: false,
      error: error.message,
      code: error.response?.data?.error_code,
      description: error.response?.data?.description
    };
  }
}

function formatTelegramMessage(signal, currentMarketPrice = 'N/A') {
  const isPureSignal = signal.type === 'PURE_SIGNAL' || 
                      (signal.conditions && 
                       signal.conditions.lst && 
                       signal.conditions.mtf && 
                       signal.conditions.volume && 
                       signal.conditions.ai && 
                       signal.conditions.level);
  
  const signalType = isPureSignal ? 'PURE' : 'LST';
  const signalEmoji = isPureSignal ? '🎯' : '📊';
  const direction = signal.signal === 'BUY' ? 'LONG' : 'SHORT';
  
  const time = new Date(signal.timestamp).toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  const entryPrice = parseFloat(signal.entry) || 0;
  const tp1Price = parseFloat(signal.tp1) || 0;
  const slPrice = parseFloat(signal.sl) || 0;
  
  let potentialProfit = 'N/A';
  let potentialLoss = 'N/A';
  
  if (entryPrice > 0 && tp1Price > 0 && slPrice > 0) {
    if (signal.signal === 'BUY') {
      potentialProfit = `$${(tp1Price - entryPrice).toFixed(2)} (${(((tp1Price - entryPrice) / entryPrice) * 100).toFixed(2)}%)`;
      potentialLoss = `$${(entryPrice - slPrice).toFixed(2)} (${(((entryPrice - slPrice) / entryPrice) * 100).toFixed(2)}%)`;
    } else {
      potentialProfit = `$${(entryPrice - tp1Price).toFixed(2)} (${(((entryPrice - tp1Price) / entryPrice) * 100).toFixed(2)}%)`;
      potentialLoss = `$${(slPrice - entryPrice).toFixed(2)} (${(((slPrice - entryPrice) / entryPrice) * 100).toFixed(2)}%)`;
    }
  }
  
  let conditionsMet = '';
  if (isPureSignal && signal.conditions) {
    conditionsMet = '\n✅ <b>Conditions Met:</b>\n';
    if (signal.conditions.lst) conditionsMet += '• LST ✓\n';
    if (signal.conditions.mtf) conditionsMet += '• MTF ✓\n';
    if (signal.conditions.volume) conditionsMet += '• Volume ✓\n';
    if (signal.conditions.ai) conditionsMet += '• AI Score ✓\n';
    if (signal.conditions.level) conditionsMet += '• Level Match ✓\n';
  }
  
  return `
${signalEmoji} <b>${signalType} ${signal.symbol} ${direction} SIGNAL</b>

📊 <b>Current Market Price:</b> ${currentMarketPrice}
📈 <b>Entry Price:</b> $${signal.entry}
⛔ <b>Stop Loss:</b> $${signal.sl}
🎯 <b>Take Profit:</b> $${signal.tp1}

💰 <b>Potential Profit:</b> ${potentialProfit}
⚠️ <b>Potential Loss:</b> ${potentialLoss}

${conditionsMet}
📊 <b>Confidence:</b> ${signal.confidence}%
⚡ <b>Risk:</b> ${signal.riskPercent}%
📡 <b>Source:</b> ${signal.source}

⏰ <b>Time:</b> ${time}
🔗 <b>Dashboard:</b> ${FRONTEND_URL}

#${signal.symbol.replace('USDT', '')} #${signalType.replace('🎯 ', '').replace('🚀 ', '').replace('🐻 ', '')} #${direction} #TradingView
  `.trim();
}

async function sendTelegramWithButtons(signalData) {
  try {
    let currentMarketPrice = 'N/A';
    try {
      const price = await getCurrentMarketPrice(signalData.symbol || 'BTCUSDT');
      currentMarketPrice = `$${price.toFixed(2)}`;
    } catch (priceError) {
      currentMarketPrice = priceCache[signalData.symbol] ? `$${priceCache[signalData.symbol].toFixed(2)}` : 'N/A';
    }
    
    const message = formatTelegramMessage(signalData, currentMarketPrice);
    const url = `https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
    
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CONFIG.CHAT_ID,
      text: message,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📊 Open TradingView Chart',
              url: `https://www.tradingview.com/chart/?symbol=${signalData.symbol}`
            }
          ],
          [
            {
              text: '🚀 Open Binance Trade',
              url: `https://www.binance.com/en/trade/${signalData.symbol}`
            }
          ],
          [
            {
              text: '📱 Open Dashboard',
              url: FRONTEND_URL
            }
          ]
        ]
      }
    }, {
      timeout: 5000
    });
    
    return { 
      success: true, 
      ok: response.data.ok,
      messageId: response.data.result?.message_id,
      currentPrice: currentMarketPrice
    };
  } catch (error) {
    logger.error('❌ Telegram buttons error:', error.message);
    
    return {
      success: false,
      error: error.message,
      code: error.response?.data?.error_code,
      description: error.response?.data?.description
    };
  }
}

// ==================== WEB PUSH FUNCTIONS ====================
app.post('/push/web/subscribe', (req, res) => {
  try {
    const subscription = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    
    const existingIndex = webSubscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existingIndex === -1) {
      webSubscriptions.push({
        ...subscription,
        timestamp: new Date()
      });
      logger.info(`🌐 New web push subscription added. Total: ${webSubscriptions.length}`);
    } else {
      webSubscriptions[existingIndex] = {
        ...subscription,
        timestamp: new Date()
      };
      logger.info(`🌐 Web push subscription updated`);
    }
    
    res.json({ 
      success: true, 
      count: webSubscriptions.length,
      message: 'Subscription successful'
    });
    
  } catch (error) {
    logger.error('Web push subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/push/web/public-key', (req, res) => {
  res.json({ publicKey: VAPID_KEYS.publicKey });
});

async function sendWebPushNotification(signalData) {
  if (webSubscriptions.length === 0) {
    return 0;
  }
  
  const notification = {
    title: `${signalData.signal} ${signalData.symbol} - ${signalData.type === 'PURE_SIGNAL' ? '🎯 PURE' : '📊 LST'}`,
    body: `Entry: $${signalData.entry} | Current: $${signalData.currentMarketPrice || 'N/A'}`,
    icon: signalData.signal === 'BUY' ? '/buy-icon.png' : '/sell-icon.png',
    data: signalData,
    tag: signalData.id,
    requireInteraction: true
  };
  
  let successCount = 0;
  
  for (const subscription of webSubscriptions) {
    try {
      await webPush.sendNotification(subscription, JSON.stringify(notification));
      successCount++;
    } catch (error) {
      logger.error('Web push error for subscription:', error.message);
      if (error.statusCode === 410) {
        webSubscriptions = webSubscriptions.filter(
          sub => sub.endpoint !== subscription.endpoint
        );
      }
    }
  }
  
  return successCount;
}

// ==================== MOBILE PUSH FUNCTIONS ====================
app.post('/push/mobile/register', (req, res) => {
  const { token, platform = 'unknown' } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  const existingIndex = mobileTokens.findIndex(t => t.token === token);
  
  if (existingIndex === -1) {
    mobileTokens.push({ 
      token, 
      platform, 
      timestamp: new Date() 
    });
    logger.info(`📱 New ${platform} token registered: ${token.substring(0, 20)}...`);
  }
  
  res.json({ 
    success: true, 
    count: mobileTokens.length,
    message: 'Token registered successfully'
  });
});

// ==================== USER AUTHENTICATION ====================
// Generate simple token
function generateToken() {
  return 'tk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
}

// Verify token middleware
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }
  
  const userId = userTokens[token];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }
  
  req.user = user;
  next();
}

// Register new user
app.post('/api/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email and password are required' 
      });
    }
    
    // Check if email exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }
    
    // Create new user
    const newUser = {
      id: 'user_' + Date.now(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password, // In production, hash this!
      role: 'user',
      createdAt: new Date().toISOString(),
      deltaConfig: null,
      algoEnabled: false,
      totalTrades: 0,
      totalProfit: 0
    };
    
    users.push(newUser);
    
    // Generate token
    const token = generateToken();
    userTokens[token] = newUser.id;
    
    logger.info(`👤 New user registered: ${newUser.email}`);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.json({
      success: true,
      message: 'Registration successful',
      user: userWithoutPassword,
      token: token
    });
    
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// Login user
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Find user
    const user = users.find(u => 
      u.email.toLowerCase() === email.toLowerCase() && 
      u.password === password
    );
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Generate token
    const token = generateToken();
    userTokens[token] = user.id;
    
    logger.info(`👤 User logged in: ${user.email}`);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: userWithoutPassword,
      token: token
    });
    
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ success: true, user: userWithoutPassword });
});

// Logout
app.post('/api/auth/logout', verifyToken, (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  delete userTokens[token];
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==================== DELTA EXCHANGE API INTEGRATION ====================
// Delta Exchange API endpoints
const DELTA_API_BASE = 'https://api.delta.exchange';
const DELTA_TESTNET_API = 'https://testnet-api.delta.exchange';

// Helper function to create Delta Exchange signature
const crypto = require('crypto');

function createDeltaSignature(secret, timestamp, method, path, body = '') {
  const message = method + timestamp + path + body;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

// Test Delta Exchange connection
app.post('/api/delta/test-connection', verifyToken, async (req, res) => {
  try {
    const { apiKey, apiSecret, testnet = false } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'API Key and Secret are required'
      });
    }
    
    const baseUrl = testnet ? DELTA_TESTNET_API : DELTA_API_BASE;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/wallet/balances';
    const signature = createDeltaSignature(apiSecret, timestamp, 'GET', path);
    
    const response = await axios.get(`${baseUrl}${path}`, {
      headers: {
        'api-key': apiKey,
        'signature': signature,
        'timestamp': timestamp,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data && response.data.success) {
      logger.info(`✅ Delta Exchange connected for user: ${req.user.email}`);
      
      res.json({
        success: true,
        message: 'Delta Exchange connected successfully',
        balances: response.data.result || [],
        testnet: testnet
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to connect to Delta Exchange',
        error: response.data
      });
    }
    
  } catch (error) {
    logger.error('Delta connection test failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Connection failed: ' + (error.response?.data?.message || error.message)
    });
  }
});

// Save Delta Exchange API config
app.post('/api/delta/save-config', verifyToken, async (req, res) => {
  try {
    const { apiKey, apiSecret, testnet = false } = req.body;
    
    if (!apiKey || !apiSecret) {
      return res.status(400).json({
        success: false,
        message: 'API Key and Secret are required'
      });
    }
    
    // Update user's delta config
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    users[userIndex].deltaConfig = {
      apiKey: apiKey,
      apiSecret: apiSecret,
      testnet: testnet,
      connectedAt: new Date().toISOString()
    };
    
    logger.info(`💰 Delta config saved for user: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'Delta Exchange configuration saved',
      connected: true,
      testnet: testnet
    });
    
  } catch (error) {
    logger.error('Save delta config error:', error);
    res.status(500).json({ success: false, message: 'Failed to save configuration' });
  }
});

// Toggle algo trading
app.post('/api/user/toggle-algo', verifyToken, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Check if Delta config exists before enabling
    if (enabled && !users[userIndex].deltaConfig) {
      return res.status(400).json({
        success: false,
        message: 'Please connect Delta Exchange API first'
      });
    }
    
    users[userIndex].algoEnabled = enabled;
    
    logger.info(`🤖 Algo trading ${enabled ? 'ENABLED' : 'DISABLED'} for: ${req.user.email}`);
    
    res.json({
      success: true,
      message: `Algo trading ${enabled ? 'enabled' : 'disabled'}`,
      algoEnabled: enabled
    });
    
  } catch (error) {
    logger.error('Toggle algo error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle algo trading' });
  }
});

// Get Delta Exchange balance
app.get('/api/delta/balance', verifyToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user?.deltaConfig) {
      return res.status(400).json({
        success: false,
        message: 'Delta Exchange not connected'
      });
    }
    
    const { apiKey, apiSecret, testnet } = user.deltaConfig;
    const baseUrl = testnet ? DELTA_TESTNET_API : DELTA_API_BASE;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/wallet/balances';
    const signature = createDeltaSignature(apiSecret, timestamp, 'GET', path);
    
    const response = await axios.get(`${baseUrl}${path}`, {
      headers: {
        'api-key': apiKey,
        'signature': signature,
        'timestamp': timestamp,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json({
      success: true,
      balances: response.data.result || [],
      testnet: testnet
    });
    
  } catch (error) {
    logger.error('Get balance error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch balance'
    });
  }
});

// Get Delta Exchange positions
app.get('/api/delta/positions', verifyToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.id);
    
    if (!user?.deltaConfig) {
      return res.status(400).json({
        success: false,
        message: 'Delta Exchange not connected'
      });
    }
    
    const { apiKey, apiSecret, testnet } = user.deltaConfig;
    const baseUrl = testnet ? DELTA_TESTNET_API : DELTA_API_BASE;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/positions';
    const signature = createDeltaSignature(apiSecret, timestamp, 'GET', path);
    
    const response = await axios.get(`${baseUrl}${path}`, {
      headers: {
        'api-key': apiKey,
        'signature': signature,
        'timestamp': timestamp,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json({
      success: true,
      positions: response.data.result || [],
      testnet: testnet
    });
    
  } catch (error) {
    logger.error('Get positions error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch positions'
    });
  }
});

// Execute trade on Delta Exchange
async function executeDeltaTrade(user, signalData) {
  try {
    if (!user.deltaConfig || !user.algoEnabled) {
      return { success: false, message: 'Algo trading not enabled or Delta not connected' };
    }
    
    const { apiKey, apiSecret, testnet } = user.deltaConfig;
    const baseUrl = testnet ? DELTA_TESTNET_API : DELTA_API_BASE;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = '/v2/orders';
    
    // Map symbol to Delta Exchange product
    let productSymbol = signalData.symbol;
    if (productSymbol.includes('USDT')) {
      productSymbol = productSymbol.replace('USDT', 'USD');
    }
    
    // Create order payload
    const orderPayload = {
      product_symbol: productSymbol,
      size: 1, // Default size - in production, calculate based on risk
      side: signalData.signal.toLowerCase() === 'buy' ? 'buy' : 'sell',
      order_type: 'market_order',
      stop_loss_price: signalData.sl ? signalData.sl.toString() : null,
      take_profit_price: signalData.tp1 ? signalData.tp1.toString() : null
    };
    
    const bodyStr = JSON.stringify(orderPayload);
    const signature = createDeltaSignature(apiSecret, timestamp, 'POST', path, bodyStr);
    
    const response = await axios.post(`${baseUrl}${path}`, orderPayload, {
      headers: {
        'api-key': apiKey,
        'signature': signature,
        'timestamp': timestamp,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data && response.data.success) {
      const order = response.data.result;
      
      // Save to order history
      orderHistory.push({
        userId: user.id,
        orderId: order.id,
        symbol: signalData.symbol,
        side: orderPayload.side,
        size: orderPayload.size,
        price: order.average_fill_price || signalData.entry,
        signalId: signalData.id,
        status: 'executed',
        executedAt: new Date().toISOString(),
        testnet: testnet
      });
      
      logger.info(`✅ Delta trade executed for ${user.email}: ${orderPayload.side} ${productSymbol}`);
      
      return {
        success: true,
        message: 'Trade executed successfully',
        order: order,
        testnet: testnet
      };
    } else {
      return {
        success: false,
        message: 'Trade execution failed',
        error: response.data
      };
    }
    
  } catch (error) {
    logger.error(`❌ Delta trade error for ${user.email}:`, error.message);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
}

// ==================== AUTO TRADE EXECUTION FOR ALL USERS ====================
async function executeAutoTradesForSignal(signalData) {
  const results = {
    total: 0,
    executed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  // Get all users with algo enabled
  const algoUsers = users.filter(u => u.algoEnabled && u.deltaConfig);
  results.total = algoUsers.length;
  
  logger.info(`🤖 Auto-executing trades for ${algoUsers.length} users...`);
  
  for (const user of algoUsers) {
    try {
      const tradeResult = await executeDeltaTrade(user, signalData);
      
      if (tradeResult.success) {
        results.executed++;
        results.details.push({
          userId: user.id,
          email: user.email,
          status: 'executed',
          order: tradeResult.order
        });
        
        // Notify user via WebSocket
        notifyUser(user.id, {
          type: 'TRADE_EXECUTED',
          signal: signalData,
          trade: tradeResult
        });
        
      } else {
        results.failed++;
        results.details.push({
          userId: user.id,
          email: user.email,
          status: 'failed',
          error: tradeResult.message
        });
        
        // Notify user about failure
        notifyUser(user.id, {
          type: 'TRADE_FAILED',
          signal: signalData,
          error: tradeResult.message
        });
      }
      
    } catch (error) {
      results.failed++;
      results.details.push({
        userId: user.id,
        email: user.email,
        status: 'error',
        error: error.message
      });
    }
  }
  
  logger.info(`🤖 Auto-trade results: ${results.executed}/${results.total} executed`);
  
  return results;
}

// Notify specific user via WebSocket
function notifyUser(userId, message) {
  const ws = userWebSockets.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error(`Failed to notify user ${userId}:`, error.message);
    }
  }
}

// ==================== ADMIN USER MANAGEMENT ====================
// Get all users (Admin only)
app.get('/api/admin/users', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  const usersWithoutPasswords = users.map(({ password, deltaConfig, ...user }) => ({
    ...user,
    deltaConnected: !!deltaConfig,
    deltaTestnet: deltaConfig?.testnet || false
  }));
  
  res.json({
    success: true,
    users: usersWithoutPasswords,
    total: users.length,
    algoEnabled: users.filter(u => u.algoEnabled).length
  });
});

// Get user order history
app.get('/api/user/orders', verifyToken, (req, res) => {
  const userOrders = orderHistory.filter(o => o.userId === req.user.id);
  
  res.json({
    success: true,
    orders: userOrders.slice(-50).reverse(),
    total: userOrders.length
  });
});

// Get all orders (Admin only)  
app.get('/api/admin/orders', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  
  res.json({
    success: true,
    orders: orderHistory.slice(-100).reverse(),
    total: orderHistory.length
  });
});

// ==================== WEBSOCKET FUNCTIONS ====================
function broadcastToWebSocket(message) {
  const messageStr = JSON.stringify(message);
  let clientCount = 0;
  
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(messageStr);
        clientCount++;
      } catch (error) {
        logger.error('WebSocket send error:', error.message);
      }
    }
  });
  
  return clientCount;
}

wss.on('connection', (ws, req) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const clientOrigin = req.headers.origin || 'unknown';
  
  clients.add(ws);
  logger.info(`🔌 New WebSocket connection from ${clientIp} (${clientOrigin}). Total: ${clients.size}`);
  
  const welcomeMessage = {
    type: 'WELCOME',
    message: 'Connected to Trading Bot WebSocket',
    platform: isCyclic ? 'cyclic' : 'local',
    timestamp: new Date().toISOString(),
    clients: clients.size,
    features: ['price_updates', 'signal_alerts', 'status_updates'],
    serverMode: isCyclic ? 'online' : 'local',
    httpEndpoint: SERVER_URL,
    wsEndpoint: WS_URL
  };
  
  try {
    ws.send(JSON.stringify(welcomeMessage));
  } catch (error) {
    logger.error('Error sending welcome message:', error);
  }
  
  ws.on('close', (code, reason) => {
    clients.delete(ws);
    logger.info(`🔌 WebSocket disconnected. Code: ${code}, Reason: ${reason || 'No reason'}. Remaining: ${clients.size}`);
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error.message);
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'SUBSCRIBE_SIGNALS') {
        logger.info('📡 Client subscribed to signals');
        const confirmMessage = {
          type: 'SUBSCRIBE_CONFIRMED',
          message: 'Subscribed to real-time signals',
          timestamp: new Date().toISOString()
        };
        
        try {
          ws.send(JSON.stringify(confirmMessage));
        } catch (error) {
          logger.error('Error sending confirmation:', error);
        }
      } else if (data.type === 'PING') {
        const pongMessage = {
          type: 'PONG',
          timestamp: new Date().toISOString()
        };
        
        try {
          ws.send(JSON.stringify(pongMessage));
        } catch (error) {
          logger.error('Error sending pong:', error);
        }
      }
    } catch (error) {
      logger.error('Error parsing WebSocket message:', error.message);
    }
  });
  
  const heartbeatInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'HEARTBEAT',
          timestamp: new Date().toISOString(),
          clients: clients.size,
          platform: isCyclic ? 'cyclic' : 'local'
        }));
      } catch (error) {
        logger.error('Error sending heartbeat:', error);
      }
    }
  }, 30000);
  
  ws.on('close', () => {
    clearInterval(heartbeatInterval);
  });
});

// ==================== PRICE API ENDPOINT ====================
app.get('/prices', async (req, res) => {
  try {
    const priceData = await fetchMarketPrices();
    
    // Broadcast with correct source
    broadcastToWebSocket({
      type: 'PRICE_UPDATE',
      timestamp: new Date().toISOString(),
      prices: priceData.prices,
      source: priceData.source,
      api: priceData.api,
      platform: isCyclic ? 'cyclic' : 'local'
    });
    
    const responseData = {
      success: true,
      prices: priceData.prices,
      source: priceData.source,
      api: priceData.api,
      timestamp: priceData.timestamp,
      platform: isCyclic ? 'cyclic' : 'local',
      cache: {
        source: priceCache.source,
        lastUpdate: priceCache.lastUpdate,
        api: priceCache.api
      },
      note: isCyclic ? 'Prices from CoinGecko API (Cloud optimized)' : 'Prices from Binance API'
    };
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Prices endpoint error:', error);
    
    const fallbackData = {
      success: true,
      prices: {
        ETHUSDT: priceCache.ETHUSDT || getRealisticPrice('ETHUSDT'),
        BTCUSDT: priceCache.BTCUSDT || getRealisticPrice('BTCUSDT'),
        SOLUSDT: priceCache.SOLUSDT || getRealisticPrice('SOLUSDT')
      },
      source: 'fallback',
      timestamp: new Date().toISOString(),
      platform: isCyclic ? 'cyclic' : 'local',
      error: error.message
    };
    
    res.json(fallbackData);
  }
});

// ==================== IMPROVED MASTER ALERT FUNCTION ====================
async function sendAllAlerts(signalData) {
  logger.info(`🚀 Sending alerts for ${signalData.symbol} ${signalData.signal} (${signalData.type})...`);
  
  const results = {
    telegram: { success: false, error: null },
    webPush: 0,
    mobilePush: 0,
    database: false,
    websocket: 0,
    autoTrades: null,
    timestamp: new Date().toISOString(),
    platform: isCyclic ? 'cyclic' : 'local'
  };
  
  try {
    let currentMarketPrice = 0;
    try {
      currentMarketPrice = await getCurrentMarketPrice(signalData.symbol);
      logger.info(`💰 Current market price for ${signalData.symbol}: $${currentMarketPrice}`);
    } catch (priceError) {
      logger.warn(`Failed to get current price:`, priceError.message);
    }
    
    const signalWithPrice = {
      ...signalData,
      currentMarketPrice: currentMarketPrice,
      alertStatus: 'sent',
      alertTimestamp: new Date().toISOString()
    };
    
    signals.push(signalWithPrice);
    results.database = true;
    logger.info('💾 Signal saved to database');
    
    if (TELEGRAM_CONFIG.ENABLED) {
      const telegramResult = await sendTelegramWithButtons(signalWithPrice);
      results.telegram = telegramResult;
      
      if (telegramResult.success) {
        logger.info(`✅ Telegram alert sent with current price`);
      } else {
        logger.warn(`⚠️ Telegram alert failed: ${telegramResult.error}`);
      }
    }
    
    if (webSubscriptions.length > 0) {
      results.webPush = await sendWebPushNotification(signalWithPrice);
      if (results.webPush > 0) {
        logger.info(`✅ Web push sent to ${results.webPush} subscribers`);
      }
    }
    
    if (clients.size > 0) {
      const wsMessage = {
        type: 'NEW_SIGNAL',
        data: signalWithPrice,
        timestamp: new Date().toISOString(),
        alertCounts: {
          telegram: TELEGRAM_CONFIG.ENABLED ? 1 : 0,
          webPush: webSubscriptions.length,
          mobilePush: mobileTokens.length,
          websocket: clients.size
        },
        alertResults: results,
        platform: isCyclic ? 'cyclic' : 'local'
      };
      
      results.websocket = broadcastToWebSocket(wsMessage);
      if (results.websocket > 0) {
        logger.info(`✅ WebSocket update sent to ${results.websocket} clients`);
      }
    }
    
    // 🤖 AUTO-EXECUTE TRADES FOR ALL USERS WITH ALGO ENABLED
    if (!signalData.demo && signalData.source !== 'test') {
      logger.info('🤖 Executing auto-trades for enabled users...');
      results.autoTrades = await executeAutoTradesForSignal(signalWithPrice);
      logger.info(`🤖 Auto-trades completed: ${results.autoTrades.executed}/${results.autoTrades.total}`);
    }
    
    logger.info(`🎯 Alert sending complete. Results:`, results);
    return results;
    
  } catch (error) {
    logger.error('❌ Error sending alerts:', error);
    return results;
  }
}

// ==================== UNIVERSAL BASIC ROUTES ====================
app.get('/api', (req, res) => {
  const responseData = {
    message: `🚀 Trading Bot API v4.0 - ${isCyclic ? 'CYCLIC.SH' : 'LOCAL'}`,
    version: '4.0.0',
    status: 'running',
    platform: isCyclic ? 'cyclic' : 'local',
    timestamp: new Date().toISOString(),
    endpoints: {
      api: SERVER_URL,
      webhook: `${SERVER_URL}/webhook/tradingview`,
      test: `${SERVER_URL}/webhook/test`,
      health: `${SERVER_URL}/health`,
      prices: `${SERVER_URL}/prices`,
      webSocket: WS_URL,
      push: {
        webSubscribe: `${SERVER_URL}/push/web/subscribe`,
        publicKey: `${SERVER_URL}/push/web/public-key`,
        mobileRegister: `${SERVER_URL}/push/mobile/register`
      }
    },
    stats: {
      signals: signals.length,
      webSubscribers: webSubscriptions.length,
      mobileTokens: mobileTokens.length,
      webSocketClients: clients.size,
      uptime: process.uptime()
    },
    features: {
      telegram: TELEGRAM_CONFIG.ENABLED,
      webPush: true,
      mobilePush: EXPO_CONFIG.ENABLED,
      webSocket: true,
      realtimePrices: true,
      priceSources: ['coingecko', 'cryptocompare', 'binance', 'simulated'],
      signalTypes: ['PURE_SIGNAL', 'LST_SIGNAL'],
      mode: isCyclic ? 'cyclic-online' : 'local-port-80'
    },
    serverInfo: {
      port: process.env.PORT || 80,
      url: SERVER_URL,
      localUrl: isCyclic ? SERVER_URL : 'http://localhost:80',
      frontendUrl: FRONTEND_URL,
      environment: NODE_ENV
    }
  };
  
  res.json(responseData);
});

// ==================== HEALTH CHECK ====================
app.get('/health', async (req, res) => {
  let telegramStatus = {
    enabled: TELEGRAM_CONFIG.ENABLED,
    botTokenConfigured: !!TELEGRAM_CONFIG.BOT_TOKEN,
    chatIdConfigured: !!TELEGRAM_CONFIG.CHAT_ID,
    testResult: null
  };
  
  if (TELEGRAM_CONFIG.ENABLED && TELEGRAM_CONFIG.BOT_TOKEN) {
    try {
      const botTest = await axios.get(`https://api.telegram.org/bot${TELEGRAM_CONFIG.BOT_TOKEN}/getMe`, {
        timeout: 3000
      });
      telegramStatus.testResult = {
        success: true,
        username: botTest.data.result.username,
        canSend: true
      };
    } catch (error) {
      telegramStatus.testResult = {
        success: false,
        error: error.message,
        code: error.response?.data?.error_code,
        description: error.response?.data?.description
      };
    }
  }
  
  const responseData = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'trading-bot-backend',
    platform: isCyclic ? 'cyclic' : 'local',
    uptime: process.uptime(),
    environment: NODE_ENV,
    urls: {
      frontend: FRONTEND_URL,
      backend: SERVER_URL,
      websocket: WS_URL
    },
    notifications: {
      telegram: telegramStatus,
      webPush: {
        enabled: true,
        subscribers: webSubscriptions.length
      },
      webSocket: {
        enabled: true,
        clients: clients.size
      }
    },
    currentPrices: priceCache,
    server: {
      port: process.env.PORT || 80,
      url: SERVER_URL,
      memory: process.memoryUsage(),
      mode: isCyclic ? 'cyclic-online' : 'local-port-80'
    }
  };
  
  res.json(responseData);
});

// ==================== TEST ENDPOINTS ====================
app.get('/prices/test', async (req, res) => {
  try {
    const binanceTest = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', {
      timeout: 3000
    });
    
    const coingeckoTest = await axios.get('https://api.coingecko.com/api/v3/ping', {
      timeout: 3000
    });
    
    res.json({
      success: true,
      platform: isCyclic ? 'cyclic' : 'local',
      binance: {
        status: 'working',
        response: binanceTest.data
      },
      coingecko: {
        status: 'working',
        response: coingeckoTest.data
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      platform: isCyclic ? 'cyclic' : 'local',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/telegram/test', async (req, res) => {
  try {
    const result = await testTelegramBot();
    
    if (result) {
      const responseData = { 
        success: true, 
        message: 'Telegram bot is working correctly',
        platform: isCyclic ? 'cyclic' : 'local',
        botToken: TELEGRAM_CONFIG.BOT_TOKEN ? 'Configured' : 'Missing',
        chatId: TELEGRAM_CONFIG.CHAT_ID ? 'Configured' : 'Missing',
        urls: {
          frontend: FRONTEND_URL,
          backend: SERVER_URL
        }
      };
      res.json(responseData);
    } else {
      const responseData = { 
        success: false, 
        platform: isCyclic ? 'cyclic' : 'local',
        error: 'Telegram bot test failed'
      };
      res.status(500).json(responseData);
    }
  } catch (error) {
    const responseData = { 
      success: false, 
      platform: isCyclic ? 'cyclic' : 'local',
      error: error.message 
    };
    res.status(500).json(responseData);
  }
});

// ==================== DATA ENDPOINTS ====================
app.get('/signals', (req, res) => {
  const responseData = {
    success: true,
    platform: isCyclic ? 'cyclic' : 'local',
    count: signals.length,
    signals: signals.slice(-50).reverse(),
    timestamp: new Date().toISOString(),
    urls: {
      frontend: FRONTEND_URL,
      backend: SERVER_URL
    }
  };
  
  res.json(responseData);
});

app.get('/notifications/status', (req, res) => {
  const responseData = {
    platform: isCyclic ? 'cyclic' : 'local',
    urls: {
      frontend: FRONTEND_URL,
      backend: SERVER_URL
    },
    telegram: {
      enabled: TELEGRAM_CONFIG.ENABLED,
      botTokenConfigured: !!TELEGRAM_CONFIG.BOT_TOKEN,
      chatIdConfigured: !!TELEGRAM_CONFIG.CHAT_ID
    },
    webPush: {
      enabled: true,
      subscribers: webSubscriptions.length,
      publicKey: VAPID_KEYS.publicKey.substring(0, 20) + '...'
    },
    webSocket: {
      enabled: true,
      clients: clients.size
    },
    mobilePush: {
      enabled: EXPO_CONFIG.ENABLED,
      tokens: mobileTokens.length
    }
  };
  
  res.json(responseData);
});

// ==================== TRADINGVIEW WEBHOOK ====================
app.post('/webhook/tradingview', async (req, res) => {
  try {
    const signalData = req.body;
    
    console.log('📡 TradingView Webhook Received:', {
      symbol: signalData.symbol,
      signal: signalData.signal,
      entry: signalData.entry,
      timestamp: new Date().toISOString(),
      platform: isCyclic ? 'cyclic' : 'local',
      port: process.env.PORT || 80
    });
    
    logger.info('📡 TradingView Signal Received:', signalData);
    
    if (!signalData.symbol || !signalData.signal) {
      const errorResponse = { 
        success: false, 
        platform: isCyclic ? 'cyclic' : 'local',
        error: 'Missing required fields: symbol and signal are required' 
      };
      return res.status(400).json(errorResponse);
    }
    
    let currentMarketPrice;
    try {
      currentMarketPrice = await getCurrentMarketPrice(signalData.symbol.toUpperCase());
      logger.info(`💰 Current market price for ${signalData.symbol}: $${currentMarketPrice}`);
    } catch (priceError) {
      currentMarketPrice = 0;
    }
    
    const isPureSignal = signalData.type === 'PURE_SIGNAL' || 
                        (signalData.conditions && 
                         signalData.conditions.lst && 
                         signalData.conditions.mtf && 
                         signalData.conditions.volume && 
                         signalData.conditions.ai && 
                         signalData.conditions.level);
    
    const signalType = isPureSignal ? 'PURE_SIGNAL' : 'LST_SIGNAL';
    
    const processedSignal = {
      id: 'tv_' + Date.now(),
      symbol: signalData.symbol.toUpperCase(),
      signal: signalData.signal.toUpperCase(),
      type: signalType,
      entry: parseFloat(signalData.entry) || 0,
      sl: parseFloat(signalData.sl) || 0,
      tp1: parseFloat(signalData.tp1) || 0,
      tp2: parseFloat(signalData.tp2) || 0,
      tp3: parseFloat(signalData.tp3) || 0,
      riskPercent: parseFloat(signalData.riskPercent) || 1.0,
      confidence: parseInt(signalData.confidence) || 75,
      timestamp: signalData.timestamp || new Date().toISOString(),
      source: 'TradingView',
      demo: signalData.demo || false,
      status: 'pending',
      currentMarketPrice: currentMarketPrice,
      conditions: signalData.conditions || {},
      alerts: []
    };
    
    const alertResults = await sendAllAlerts(processedSignal);
    
    processedSignal.alerts = alertResults;
    processedSignal.status = 'alerted';
    
    const responseData = { 
      success: true, 
      platform: isCyclic ? 'cyclic' : 'local',
      message: 'Signal received and alerts sent successfully',
      signal: processedSignal,
      alerts: alertResults,
      webhook_info: {
        url: `${SERVER_URL}/webhook/tradingview`,
        method: 'POST',
        content_type: 'application/json',
        port: process.env.PORT || 80,
        compatible: true
      },
      urls: {
        frontend: FRONTEND_URL,
        backend: SERVER_URL
      },
      stats: {
        totalSignals: signals.length,
        webSubscribers: webSubscriptions.length,
        webSocketClients: clients.size
      }
    };
    
    res.json(responseData);
    
  } catch (error) {
    logger.error('❌ Webhook processing error:', error);
    const errorResponse = { 
      success: false, 
      platform: isCyclic ? 'cyclic' : 'local',
      error: 'Internal server error',
      message: error.message 
    };
    res.status(500).json(errorResponse);
  }
});

// ==================== TEST SIGNAL ENDPOINT ====================
app.get('/webhook/test', async (req, res) => {
  try {
    let btcPrice, ethPrice, solPrice;
    try {
      btcPrice = await getCurrentMarketPrice('BTCUSDT');
      ethPrice = await getCurrentMarketPrice('ETHUSDT');
      solPrice = await getCurrentMarketPrice('SOLUSDT');
      logger.info(`💰 Current prices - BTC: $${btcPrice}, ETH: $${ethPrice}, SOL: $${solPrice}`);
    } catch (priceError) {
      btcPrice = 45000;
      ethPrice = 2500;
      solPrice = 100;
    }
    
    const testSignals = [
      {
        id: 'test_pure_' + Date.now(),
        symbol: 'BTCUSDT',
        signal: 'BUY',
        type: 'PURE_SIGNAL',
        entry: btcPrice.toFixed(2),
        sl: (btcPrice * 0.98).toFixed(2),
        tp1: (btcPrice * 1.03).toFixed(2),
        tp2: (btcPrice * 1.05).toFixed(2),
        tp3: (btcPrice * 1.08).toFixed(2),
        riskPercent: 1.5,
        confidence: 85,
        timestamp: new Date().toISOString(),
        source: 'TEST',
        demo: true,
        status: 'test',
        currentMarketPrice: btcPrice,
        conditions: {
          lst: true,
          mtf: true,
          volume: true,
          ai: true,
          level: true
        }
      },
      {
        id: 'test_lst_' + Date.now(),
        symbol: 'ETHUSDT',
        signal: 'SELL',
        type: 'LST_SIGNAL',
        entry: ethPrice.toFixed(2),
        sl: (ethPrice * 1.02).toFixed(2),
        tp1: (ethPrice * 0.97).toFixed(2),
        tp2: (ethPrice * 0.95).toFixed(2),
        tp3: (ethPrice * 0.92).toFixed(2),
        riskPercent: 1.0,
        confidence: 70,
        timestamp: new Date().toISOString(),
        source: 'TEST',
        demo: true,
        status: 'test',
        currentMarketPrice: ethPrice,
        conditions: {
          lst: true,
          volume: true,
          ai: true
        }
      }
    ];
    
    logger.info('🧪 Sending test signals (PURE + LST)...');
    
    const alertResults = [];
    
    for (const testSignal of testSignals) {
      const result = await sendAllAlerts(testSignal);
      alertResults.push({
        symbol: testSignal.symbol,
        type: testSignal.type,
        alerts: result
      });
    }
    
    const responseData = { 
      success: true, 
      platform: isCyclic ? 'cyclic' : 'local',
      message: 'Test signals sent successfully',
      signals: testSignals,
      alerts: alertResults,
      urls: {
        frontend: FRONTEND_URL,
        backend: SERVER_URL
      },
      currentPrices: {
        BTCUSDT: btcPrice,
        ETHUSDT: ethPrice,
        SOLUSDT: solPrice
      }
    };
    
    res.json(responseData);
    
  } catch (error) {
    logger.error('❌ Test error:', error);
    res.status(500).json({ 
      success: false, 
      platform: isCyclic ? 'cyclic' : 'local',
      error: error.message 
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================
app.get('/admin/status', (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== 'Bearer admin123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const responseData = {
    status: 'running',
    platform: isCyclic ? 'cyclic' : 'local',
    tradingActive: true,
    activePositions: 0,
    totalSignals: signals.length,
    webSocketClients: clients.size,
    realTimePrices: priceCache,
    serverTime: new Date().toISOString(),
    priceSource: priceCache.source,
    priceApi: priceCache.api,
    connectionMode: isCyclic ? 'cyclic-online' : 'local-port-80',
    urls: {
      frontend: FRONTEND_URL,
      backend: SERVER_URL,
      websocket: WS_URL
    }
  };
  
  res.json(responseData);
});

app.get('/admin/stats', (req, res) => {
  const auth = req.headers.authorization;
  if (auth !== 'Bearer admin123') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const responseData = {
    platform: isCyclic ? 'cyclic' : 'local',
    totalRealSignals: signals.length,
    winRate: '75%',
    totalProfit: '$1,250.50',
    activeRealPositions: 0,
    demoPositions: 0,
    priceSource: priceCache.source,
    priceApi: priceCache.api,
    lastPriceUpdate: priceCache.lastUpdate,
    timestamp: new Date().toISOString(),
    urls: {
      frontend: FRONTEND_URL,
      backend: SERVER_URL
    },
    serverMode: isCyclic ? 'cyclic-online' : 'local-port-80'
  };
  
  res.json(responseData);
});

// ==================== DEBUG ENDPOINTS ====================
app.get('/debug/source', (req, res) => {
  res.json({
    platform: isCyclic ? 'cyclic' : 'local',
    currentCache: priceCache,
    memory: {
      source: priceCache.source,
      api: priceCache.api || 'none',
      lastUpdate: priceCache.lastUpdate,
      ETH: priceCache.ETHUSDT,
      BTC: priceCache.BTCUSDT,
      SOL: priceCache.SOLUSDT
    },
    config: {
      isCyclic: isCyclic,
      nodeEnv: NODE_ENV,
      port: process.env.PORT || 80
    },
    timestamp: new Date().toISOString()
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// ==================== UNIVERSAL PORT CONFIG ====================
// ✅ CYCLIC.SH: Uses dynamic port from environment
// ✅ LOCAL: Uses port 8080 for TradingView compatibility
const PORT = process.env.PORT || 8080;

// Start periodic price updates
setInterval(async () => {
  try {
    await fetchMarketPrices();
    
    broadcastToWebSocket({
      type: 'PRICE_UPDATE',
      timestamp: new Date().toISOString(),
      prices: {
        ETHUSDT: priceCache.ETHUSDT,
        BTCUSDT: priceCache.BTCUSDT,
        SOLUSDT: priceCache.SOLUSDT
      },
      source: priceCache.source,
      api: priceCache.api,
      platform: isCyclic ? 'cyclic' : 'local'
    });
  } catch (error) {
    logger.warn('Periodic price update failed:', error.message);
  }
}, 10000);

// Heartbeat for WebSocket connections
setInterval(() => {
  broadcastToWebSocket({
    type: 'HEARTBEAT',
    timestamp: new Date().toISOString(),
    clients: clients.size,
    platform: isCyclic ? 'cyclic' : 'local'
  });
}, 30000);

// ==================== GRACEFUL SHUTDOWN ====================
let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  logger.info(`${signal} received. Starting graceful shutdown...`);
  
  console.log('🔌 Closing WebSocket connections...');
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify({
          type: 'SHUTDOWN',
          message: 'Server is shutting down',
          platform: isCyclic ? 'cyclic' : 'local',
          timestamp: new Date().toISOString()
        }));
        client.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
    }
  });
  
  console.log('🌐 Closing HTTP server...');
  server.close(() => {
    console.log('✅ HTTP server closed');
    logger.info('HTTP server closed');
    
    setTimeout(() => {
      console.log('✅ Shutdown complete. Exiting...');
      process.exit(0);
    }, 3000);
  });
  
  setTimeout(() => {
    console.log('⚠️ Server did not close gracefully. Forcing exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  console.error('🔥 Uncaught Exception:', error);
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection:', reason);
});

// ==================== START SERVER ====================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server started on port ${PORT}`);
  
  (async () => {
    console.log('\n' + '='.repeat(60));
    console.log(`🚀 TRADING BOT SERVER v4.0 - ${isCyclic ? 'CYCLIC.SH' : 'LOCAL'}`);
    console.log('='.repeat(60));
    console.log(`📡 Server URL: ${SERVER_URL}`);
    console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🔌 WebSocket: ${WS_URL}`);
    console.log(`⚡ Platform: ${isCyclic ? 'Cyclic.sh' : 'Local'}`);
    console.log(`🏗️  Mode: ${isCyclic ? 'Cloud Online' : 'Local Port 80'}`);
    console.log(`📊 Port: ${PORT} (${isCyclic ? 'Cyclic Auto' : 'TradingView Compatible'})`);
    
    if (TELEGRAM_CONFIG.ENABLED) {
      console.log('\n🔍 Testing Telegram Bot...');
      const telegramTest = await testTelegramBot();
      if (telegramTest) {
        console.log('✅ Telegram Bot: READY');
      } else {
        console.log('❌ Telegram Bot: NOT CONFIGURED');
      }
    }
    
    console.log(`\n🔗 IMPORTANT ENDPOINTS:`);
    console.log(`   🌐 Frontend: ${FRONTEND_URL}`);
    console.log(`   🔧 Backend API: ${SERVER_URL}/api`);
    console.log(`   📊 Health Check: ${SERVER_URL}/health`);
    console.log(`   🤖 Telegram Test: ${SERVER_URL}/telegram/test`);
    console.log(`   💰 Prices API: ${SERVER_URL}/prices`);
    console.log(`   🧪 Price API Test: ${SERVER_URL}/prices/test`);
    console.log(`   🎯 TradingView Webhook: ${SERVER_URL}/webhook/tradingview`);
    console.log(`   🧪 Test Signal: ${SERVER_URL}/webhook/test`);
    console.log(`   🔌 WebSocket: ${WS_URL}`);
    console.log(`   🐞 Debug Source: ${SERVER_URL}/debug/source`);
    
    console.log(`\n📱 NOTIFICATION STATUS:`);
    console.log(`   Telegram: ${TELEGRAM_CONFIG.ENABLED ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Web Push: ✅ READY`);
    console.log(`   WebSocket: ✅ READY`);
    console.log(`   Signal Types: 🎯 PURE_SIGNAL, 📊 LST_SIGNAL`);
    console.log(`   Price Sources: 🦎 CoinGecko, 📊 CryptoCompare, 💰 Binance`);
    
    console.log(`\n🚀 Server is running on PORT ${PORT}. Press Ctrl+C to stop`);
    console.log('='.repeat(60) + '\n');
    
    logger.info(`Server started on port ${PORT} (Platform: ${isCyclic ? 'Cyclic.sh' : 'Local'})`);
    
    // Initial price fetch
    fetchMarketPrices().then(() => {
      logger.info('✅ Initial prices fetched successfully');
    });
  })();
});

module.exports = { app, server };