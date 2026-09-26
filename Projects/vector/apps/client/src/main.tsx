import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { auth } from './auth/auth-store';
import { RedirectIfSignedIn, RequireAuth } from './auth/RequireAuth';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ScopeScreen } from './screens/ScopeScreen';
import { SessionSetupScreen } from './screens/SessionSetupScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DocumentSettings } from './settings/DocumentSettings';
import './styles/global.css';

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <RedirectIfSignedIn>
        <AuthScreen mode="login" />
      </RedirectIfSignedIn>
    ),
  },
  {
    path: '/register',
    element: (
      <RedirectIfSignedIn>
        <AuthScreen mode="register" />
      </RedirectIfSignedIn>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <HomeScreen />
      </RequireAuth>
    ),
  },
  {
    path: '/setup/:airspaceId',
    element: (
      <RequireAuth>
        <SessionSetupScreen />
      </RequireAuth>
    ),
  },
  {
    path: '/settings',
    element: (
      <RequireAuth>
        <SettingsScreen />
      </RequireAuth>
    ),
  },
  {
    path: '/scope/:airspaceId',
    element: (
      <RequireAuth>
        <ScopeScreen />
      </RequireAuth>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

void auth.restore();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <DocumentSettings />
    <RouterProvider router={router} />
  </StrictMode>,
);
