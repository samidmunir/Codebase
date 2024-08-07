import "./App.css";
import Header from "./components/header/Header";
import { LineGraph } from "./components/lineChart/Line";
import { BarChart } from "./components/barChart/Bar";
import { PieChart } from "./components/pieChart/Pie";
import { Pie } from "react-chartjs-2";

function App() {
  return (
    <div className="App">
      <Header />
      <LineGraph />
      <BarChart />
      <PieChart />
    </div>
  );
}

export default App;
