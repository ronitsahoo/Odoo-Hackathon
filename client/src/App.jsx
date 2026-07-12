import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import Placeholder from './pages/Placeholder.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import OrganizationSetup from './pages/admin/OrganizationSetup.jsx';
import EmployeeDirectory from './pages/admin/EmployeeDirectory.jsx';
import DepartmentsTab from './pages/admin/DepartmentsTab.jsx';
import CategoriesTab from './pages/admin/CategoriesTab.jsx';
import AdminModeration from './pages/admin/AdminModeration.jsx';
import AdminBroadcast from './pages/admin/AdminBroadcast.jsx';
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
        {/* Remaining modules — placeholders */}
        {[
          { path: '/booking', title: 'Resource Booking' },
          { path: '/audit', title: 'Audit' },
          { path: '/reports', title: 'Reports' },
          { path: '/notifications', title: 'Notifications' },
        ].map(({ path, title }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <Placeholder title={title} />
              </ProtectedRoute>
            }
          />
        ))}

        {/* Admin */}
        <Route
          path="/admin"
          element={
            <RoleRoute>
              <AdminDashboard />
            </RoleRoute>
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
