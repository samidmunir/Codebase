import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "../layout/MainLayout";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [],
  },
  {},
]);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
