import Main from "./layouts/Main";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";

const App = () => {
  return (
    <Main>
      <Routes>
        <Route path="/" index element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
      </Routes>
    </Main>
  );
};
export default App;
