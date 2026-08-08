import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layout/MainLayout";
import LandingPage from "../pages/LandingPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
    ],
  },
  {},
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
