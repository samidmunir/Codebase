import { Routes, Route } from "react-router-dom";
import PrimaryLayout from "../layouts/PrimaryLayout";
import LandingPage from "../pages/LandingPage";
import AuthProtected from "../layouts/protected/AuthProtected";
import CustomerDashboardPage from "../pages/customer/CustomerDashboardPage";
import LoginPage from "../pages/auth/LoginPage";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<PrimaryLayout />}>
        <Route path="/" index element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route
        path="/dashboard"
        element={
          <AuthProtected>
            <CustomerDashboardPage />
          </AuthProtected>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
