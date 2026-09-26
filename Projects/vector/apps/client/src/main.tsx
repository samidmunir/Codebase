import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { HomeScreen } from './screens/HomeScreen';
import { ScopeScreen } from './screens/ScopeScreen';
import './styles/global.css';

const router = createBrowserRouter([
  { path: '/', element: <HomeScreen /> },
  { path: '/scope/:airspaceId', element: <ScopeScreen /> },
]);

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
