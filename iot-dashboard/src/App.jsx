import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import DashboardView from './pages/DashboardView';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import OfflinePrompt from './components/OfflinePrompt';

function App() {
  const [offlinePrompt, setOfflinePrompt] = useState(false);

  useEffect(() => {
    const checkConnection = async () => {
      console.log("checking connection");
      try {
        const res = await fetch('/ping', { method: 'GET' });
        console.log('Ping response:', res.status);
        if (!res.ok) throw new Error('Offline');
        setOfflinePrompt(false);
      } catch {
        setOfflinePrompt(true);
      }
    };

    checkConnection(); // check on load
    const interval = setInterval(checkConnection, 10000); // repeat every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <OfflinePrompt show={offlinePrompt} />
      <Routes>
        <Route path="/" element={<Login />} />

        {/* ✅ Authenticated User Dashboard */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={['user', 'block', 'gp']}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* ✅ Device details (View Details) */}
        <Route
          path="/device/:mac"
          element={
            <PrivateRoute allowedRoles={['user', 'block', 'gp', 'admin']}>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* ✅ Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <PrivateRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;

