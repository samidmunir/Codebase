import Main from "./layouts/Main";
import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";

const App = () => {
  return (
    <Main>
      <Routes>
        <Route path="/" index element={<Landing />} />
      </Routes>
    </Main>
  );
};
export default App;
