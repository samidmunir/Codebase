import Main from "./layouts/Main";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import CustomerProtected from "./layouts/CustomerProtected";
import Dashboard from "./pages/Dashboard";
import Catalog from "./pages/Catalog";
import Services from "./pages/Services";
import Activity from "./pages/Activity";

const App = () => {
  return (
    <Main>
      <Routes>
        <Route path="/" index element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route element={<CustomerProtected />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/services" element={<Services />} />
        <Route path="/services/:serviceId" element={<Services />} />
        <Route path="/activity" element={<Activity />} />
      </Routes>
    </Main>
  );
};

export default App;
