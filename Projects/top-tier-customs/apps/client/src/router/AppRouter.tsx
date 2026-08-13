import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LandingPage from "../pages/LandingPage";
import ServicesPage from "../pages/Services";
import ActivityPage from "../pages/ActivityPage";
import GaragePage from "../pages/GaragePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        path: "services",
        element: <ServicesPage />,
      },
      {
        path: "services/:slug",
      },
      {
        path: "garage",
        element: <GaragePage />,
      },
      {
        path: "activity",
        element: <ActivityPage />,
      },
    ],
  },
  {},
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
