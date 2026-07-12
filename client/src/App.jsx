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
        {[
          { path: '/assets', title: 'Assets' },
          { path: '/allocation', title: 'Allocation & Transfer' },
          { path: '/booking', title: 'Resource Booking' },
          { path: '/maintenance', title: 'Maintenance' },
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
