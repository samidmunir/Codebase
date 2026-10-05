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
import { MyProfileRedirect, ProfileScreen } from './screens/pilots/ProfileScreen';
import { ResultScreen } from './screens/pilots/ResultScreen';
import { RecordsScreen } from './screens/records/RecordsScreen';
import { GuideScreen } from './screens/guide/GuideScreen';
import { AboutScreen, PrivacyScreen, TermsScreen } from './screens/legal/LegalScreens';
import { AirspaceScreen } from './screens/airspaces/AirspaceScreen';
import { AirspacesScreen } from './screens/airspaces/AirspacesScreen';
import { NewsPostScreen } from './screens/news/NewsPostScreen';
import { NewsScreen } from './screens/news/NewsScreen';
import { ScopeScreen } from './screens/ScopeScreen';
import { SessionSetupScreen } from './screens/SessionSetupScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DocumentSettings } from './settings/DocumentSettings';
import { NotFoundScreen } from './site/NotFoundScreen';
import {
  EmailLinkScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from './screens/email/EmailScreens';
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
      { path: '/me', element: signedIn(<MyProfileRedirect />) },
      { path: '/pilots/:handle', element: <ProfileScreen /> },
      { path: '/results/:id', element: <ResultScreen /> },
      { path: '/records', element: <RecordsScreen /> },
      { path: '/guide', element: <GuideScreen /> },
      { path: '/airspaces', element: <AirspacesScreen /> },
      { path: '/airspaces/:id', element: <AirspaceScreen /> },
      { path: '/news', element: <NewsScreen /> },
      { path: '/about', element: <AboutScreen /> },
      { path: '/terms', element: <TermsScreen /> },
      { path: '/privacy', element: <PrivacyScreen /> },
      { path: '/news/:slug', element: <NewsPostScreen /> },
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
  // Focused pages for emailed links (signed in or not).
  { path: '/forgot-password', element: <ForgotPasswordScreen /> },
  { path: '/reset-password', element: <ResetPasswordScreen /> },
  { path: '/verify-email', element: <EmailLinkScreen kind="verify" /> },
  { path: '/confirm-email', element: <EmailLinkScreen kind="confirm" /> },
  { path: '/undo-email-change', element: <EmailLinkScreen kind="undo" /> },
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
