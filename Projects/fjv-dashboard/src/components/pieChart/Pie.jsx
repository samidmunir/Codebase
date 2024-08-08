import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, Tooltip, Legend, ArcElement } from "chart.js";
import { pilotHoursData } from "../../utils/UserData";

ChartJS.register(Tooltip, Legend, ArcElement);

export const PieChart = () => {
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
      },
      title: {
        display: true,
        text: "Hours flown per aircraft",
        position: "top",
      },
    },
  };
  return <Pie options={options} data={pilotHoursData} />;
};
