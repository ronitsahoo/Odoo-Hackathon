import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';

import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import GuestRoute from './components/GuestRoute.jsx';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import OrganizationSetup from './pages/admin/OrganizationSetup.jsx';
import EmployeeDirectory from './pages/admin/EmployeeDirectory.jsx';
import DepartmentsTab from './pages/admin/DepartmentsTab.jsx';
import CategoriesTab from './pages/admin/CategoriesTab.jsx';
import NotFound from './pages/NotFound.jsx';
// Module 3: Asset pages
import Assets from './pages/asset/Assets.jsx';
import AssetDetail from './pages/asset/AssetDetail.jsx';
import RegisterAsset from './pages/asset/RegisterAsset.jsx';
import EditAsset from './pages/asset/EditAsset.jsx';
// Module 4: Allocation & Transfer
import Allocation from './pages/asset/Allocation.jsx';
// Module 5: Maintenance
import Maintenance from './pages/asset/Maintenance.jsx';
// Final build: Booking (Screen 6), Audit (Screen 8), Reports (Screen 9)
import Booking from './pages/asset/Booking.jsx';
import Audit from './pages/asset/Audit.jsx';
import Reports from './pages/asset/Reports.jsx';

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
        {/* Auth pages — guests only; an authed user is bounced to the dashboard. */}
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* Authenticated Root & Dashboard */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* AssetFlow modules not yet built — placeholders so nav never dead-links. */}
        {/* Module 3: Asset Registry & Directory (complete) */}
        <Route
          path="/assets"
          element={
            <ProtectedRoute>
              <Assets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/register"
          element={
            <RoleRoute roles={['asset_manager', 'admin']}>
              <RegisterAsset />
            </RoleRoute>
          }
        />
        <Route
          path="/assets/:id"
          element={
            <ProtectedRoute>
              <AssetDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assets/:id/edit"
          element={
            <RoleRoute roles={['asset_manager', 'admin']}>
              <EditAsset />
            </RoleRoute>
          }
        />
        {/* Module 4: Allocation & Transfer (complete) */}
        <Route
          path="/allocation"
          element={
            <ProtectedRoute>
              <Allocation />
            </ProtectedRoute>
          }
        />
        {/* Module 5: Maintenance (complete) */}
        <Route
          path="/maintenance"
          element={
            <ProtectedRoute>
              <Maintenance />
            </ProtectedRoute>
          }
        />
        {/* Resource Booking (Screen 6) */}
        <Route
          path="/booking"
          element={
            <ProtectedRoute>
              <Booking />
            </ProtectedRoute>
          }
        />
        {/* Audit (Screen 8) */}
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <Audit />
            </ProtectedRoute>
          }
        />
        {/* Reports (Screen 9) — managers/admins */}
        <Route
          path="/reports"
          element={
            <RoleRoute roles={['asset_manager', 'admin']}>
              <Reports />
            </RoleRoute>
          }
        />
        {/* Module 6: Notifications (complete) */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />

        {/* Organization setup (Module 2 home): admin-only, Employee tab inside. */}
        <Route
          path="/admin/organization"
          element={
            <RoleRoute roles={['admin']}>
              <OrganizationSetup />
            </RoleRoute>
          }
        >
          <Route index element={<Navigate to="departments" replace />} />
          <Route path="departments" element={<DepartmentsTab />} />
          <Route path="categories" element={<CategoriesTab />} />
          <Route path="employees" element={<EmployeeDirectory />} />
        </Route>

        {/* Legacy admin routes removed — one dashboard at "/". Redirect stragglers. */}
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/admin/broadcast" element={<Navigate to="/" replace />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
