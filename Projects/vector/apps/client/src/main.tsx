import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { auth } from './auth/auth-store';
import { RedirectIfSignedIn, RequireAuth } from './auth/RequireAuth';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ScopeScreen } from './screens/ScopeScreen';
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
    path: '/scope/:airspaceId',
    element: (
      <RequireAuth>
        <ScopeScreen />
      </RequireAuth>
    ),
  },
]);

void auth.restore();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
