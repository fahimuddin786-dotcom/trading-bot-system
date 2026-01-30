// src/App.js - Main App with Authentication
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import UserDashboard from './components/UserDashboard';
import Login from './components/Login';
import Register from './components/Register';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setAuthMode('login');
  };

  // Show loading screen while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <span className="loading-icon">🤖</span>
          <h2>AI Trading Bot</h2>
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth screens if not logged in
  if (!user) {
    return authMode === 'login' ? (
      <Login 
        onLogin={handleLogin} 
        onSwitchToRegister={() => setAuthMode('register')} 
      />
    ) : (
      <Register 
        onRegister={handleRegister} 
        onSwitchToLogin={() => setAuthMode('login')} 
      />
    );
  }

  // User is logged in - show dashboard based on role
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Admin route - only for admin users */}
          <Route 
            path="/admin" 
            element={
              user.role === 'admin' ? (
                <AdminDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          {/* Default route - User Dashboard */}
          <Route 
            path="/" 
            element={<UserDashboard user={user} onLogout={handleLogout} />} 
          />
          
          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
