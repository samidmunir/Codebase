import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { auth } from './auth/auth-store';
import { RedirectIfSignedIn, RequireAuth } from './auth/RequireAuth';
import { AuthScreen } from './screens/AuthScreen';
import { LandingScreen } from './screens/landing/LandingScreen';
import { AboutScreen, PrivacyScreen, TermsScreen } from './screens/legal/LegalScreens';
import { AirspaceScreen } from './screens/airspaces/AirspaceScreen';
import { AirspacesScreen } from './screens/airspaces/AirspacesScreen';
import { DocumentSettings } from './settings/DocumentSettings';
import { NotFoundScreen } from './site/NotFoundScreen';
import {
  EmailLinkScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from './screens/email/EmailScreens';
import { SiteLayout } from './site/SiteLayout';
import { watchForUpdates } from './site/app-version';
import { lazyPage } from './site/lazy-page';
import { AppShell } from './site/AppShell';
import './styles/global.css';

// Screens that load when first opened: the front page, the airspaces and signing in
// come with the app; the scope, setup, admin pages and community load on demand.
const AccountScreen = lazyPage(() => import('./screens/account/AccountScreen'), 'AccountScreen');
const AdminScreen = lazyPage(() => import('./screens/admin/AdminScreen'), 'AdminScreen');
const PlayScreen = lazyPage(() => import('./screens/PlayScreen'), 'PlayScreen');
const ResultScreen = lazyPage(() => import('./screens/pilots/ResultScreen'), 'ResultScreen');
const RecordsScreen = lazyPage(() => import('./screens/records/RecordsScreen'), 'RecordsScreen');
const GuideScreen = lazyPage(() => import('./screens/guide/GuideScreen'), 'GuideScreen');
const NewsPostScreen = lazyPage(() => import('./screens/news/NewsPostScreen'), 'NewsPostScreen');
const NewsScreen = lazyPage(() => import('./screens/news/NewsScreen'), 'NewsScreen');
const ScopeScreen = lazyPage(() => import('./screens/ScopeScreen'), 'ScopeScreen');
const SessionSetupScreen = lazyPage(
  () => import('./screens/SessionSetupScreen'),
  'SessionSetupScreen',
);
const SettingsScreen = lazyPage(() => import('./screens/SettingsScreen'), 'SettingsScreen');
const CategoryScreen = lazyPage(
  () => import('./screens/community/CategoryScreen'),
  'CategoryScreen',
);
const CommunityScreen = lazyPage(
  () => import('./screens/community/CommunityScreen'),
  'CommunityScreen',
);
const NewThreadScreen = lazyPage(
  () => import('./screens/community/NewThreadScreen'),
  'NewThreadScreen',
);
const ThreadScreen = lazyPage(() => import('./screens/community/ThreadScreen'), 'ThreadScreen');
const AdminUserScreen = lazyPage(
  () => import('./screens/admin/AdminUserScreen'),
  'AdminUserScreen',
);
const ProfileScreen = lazyPage(() => import('./screens/pilots/ProfileScreen'), 'ProfileScreen');
const MyProfileRedirect = lazyPage(
  () => import('./screens/pilots/ProfileScreen'),
  'MyProfileRedirect',
);

const signedIn = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>;

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
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
          { path: '/community', element: <CommunityScreen /> },
          { path: '/community/t/:id', element: <ThreadScreen /> },
          { path: '/community/t/:id/:slug', element: <ThreadScreen /> },
          { path: '/community/:category', element: <CategoryScreen /> },
          { path: '/community/:category/new', element: signedIn(<NewThreadScreen />) },
          { path: '/about', element: <AboutScreen /> },
          { path: '/terms', element: <TermsScreen /> },
          { path: '/privacy', element: <PrivacyScreen /> },
          { path: '/news/:slug', element: <NewsPostScreen /> },
          { path: '/settings', element: signedIn(<SettingsScreen />) },
          { path: '/admin', element: signedIn(<AdminScreen />) },
          { path: '/admin/users/:id', element: signedIn(<AdminUserScreen />) },
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
    ],
  },
]);

void auth.restore();
watchForUpdates();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <DocumentSettings />
    <RouterProvider router={router} />
  </StrictMode>,
);
