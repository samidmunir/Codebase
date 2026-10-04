import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { auth } from './auth/auth-store';
import { RedirectIfSignedIn, RequireAuth } from './auth/RequireAuth';
import { AccountScreen } from './screens/account/AccountScreen';
import { AdminScreen } from './screens/admin/AdminScreen';
import { AuthScreen } from './screens/AuthScreen';
import { LandingScreen } from './screens/landing/LandingScreen';
import { PlayScreen } from './screens/PlayScreen';
import { ScopeScreen } from './screens/ScopeScreen';
import { SessionSetupScreen } from './screens/SessionSetupScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DocumentSettings } from './settings/DocumentSettings';
import { NotFoundScreen } from './site/NotFoundScreen';
import { SiteLayout } from './site/SiteLayout';
import './styles/global.css';

const signedIn = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>;

const router = createBrowserRouter([
  // The site: header, page, footer.
  {
    element: <SiteLayout />,
    children: [
      { path: '/', element: <LandingScreen /> },
      { path: '/play', element: signedIn(<PlayScreen />) },
      { path: '/account', element: signedIn(<AccountScreen />) },
      { path: '/settings', element: signedIn(<SettingsScreen />) },
      { path: '/admin', element: signedIn(<AdminScreen />) },
      { path: '*', element: <NotFoundScreen /> },
    ],
  },
  // Focused pages: signing in and registering.
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
  // Full screen: setting up a session, and the scope.
  { path: '/setup/:airspaceId', element: signedIn(<SessionSetupScreen />) },
  { path: '/scope/:airspaceId', element: signedIn(<ScopeScreen />) },
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
