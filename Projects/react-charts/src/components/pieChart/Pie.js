import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, Tooltip, Legend, ArcElement } from "chart.js";
import { pieChartData } from "../../utils/Data";

ChartJS.register(Tooltip, Legend, ArcElement);

export const PieChart = () => {
  const options = {};
  return (
    <Pie
      options={options}
      data={pieChartData}
      style={{ marginTop: "80px", borderTop: "3px solid #0099ff" }}
    />
  );
};
