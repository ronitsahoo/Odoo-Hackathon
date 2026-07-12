import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';

import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import CreateEditItem from './pages/CreateEditItem.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AdminModeration from './pages/admin/AdminModeration.jsx';
import AdminBroadcast from './pages/admin/AdminBroadcast.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * Route table. All pages share the Layout shell. Auth pages (Login/Register)
 * also render inside Layout so the navbar stays consistent.
 * loadUser() runs once on mount to restore a session from a stored token.
 */
export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/items/:id" element={<ItemDetail />} />

        {/* Authenticated */}
        <Route
          path="/items/new"
          element={
            <ProtectedRoute>
              <CreateEditItem />
            </ProtectedRoute>
          }
        />
        <Route
          path="/items/:id/edit"
          element={
            <ProtectedRoute>
              <CreateEditItem />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RoleRoute>
              <AdminDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RoleRoute>
              <AdminUsers />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <RoleRoute>
              <AdminModeration />
            </RoleRoute>
          }
        />
        <Route
          path="/admin/broadcast"
          element={
            <RoleRoute>
              <AdminBroadcast />
            </RoleRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
