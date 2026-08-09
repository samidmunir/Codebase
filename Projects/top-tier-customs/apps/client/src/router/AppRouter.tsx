import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LandingPage from "../pages/LandingPage";
import ServicesPage from "../pages/Services";

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
    ],
  },
  {},
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
