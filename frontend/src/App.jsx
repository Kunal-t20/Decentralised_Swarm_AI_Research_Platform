import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Workspace from './pages/Workspace';

export default function App() {
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const storedEmail = localStorage.getItem('user_email') || 'researcher@swarm.ai';
    const token = localStorage.getItem('token');
    if (token) setUserEmail(storedEmail);
  }, []);

  const handleLoginSuccess = (email) => {
    localStorage.setItem('user_email', email);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_email');
    localStorage.removeItem('token');
    setUserEmail('');
  };

  const isAuthenticated = () => !!localStorage.getItem('token');

  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg)' }}>
        <Navbar userEmail={isAuthenticated() ? userEmail : ''} onLogout={handleLogout} />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route
              path="/login"
              element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login onLoginSuccess={handleLoginSuccess} />}
            />
            <Route
              path="/dashboard"
              element={isAuthenticated() ? <Dashboard /> : <Navigate to="/login" replace />}
            />
            <Route
              path="/workspace/:jobId"
              element={isAuthenticated() ? <Workspace /> : <Navigate to="/login" replace />}
            />
            <Route
              path="*"
              element={<Navigate to={isAuthenticated() ? '/dashboard' : '/login'} replace />}
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
