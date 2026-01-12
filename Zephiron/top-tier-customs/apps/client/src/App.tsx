import Primary from "./layouts/Primary";
import { Routes, Route } from "react-router-dom";

const App = () => {
  return (
    <Primary>
      <Routes>
        <Route path="/" index element={<h1>Top Tier Customs</h1>} />
      </Routes>
    </Primary>
  );
};

export default App;
