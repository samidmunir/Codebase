import "./App.css";
import Header from "./components/header/Header";
import { LineGraph } from "./components/lineChart/Line";

function App() {
  return (
    <div className="App">
      <Header />
      <LineGraph />
    </div>
  );
}

export default App;
