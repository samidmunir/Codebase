export const lineChartData = {
  labels: [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ],
  datasets: [
    {
      label: "Sami Steps",
      data: [3000, 5000, 4500, 6000, 8000, 7000, 9000],
      borderColor: "rgb(75, 192, 192)",
    },
    {
      label: "Meenah Steps",
      data: [2000, 4000, 5000, 6000, 8000, 6000, 7500],
      borderColor: "red",
    },
  ],
};

export const barChartData = {
  labels: ["Rent", "Groceries", "Utilities", "Entertainment", "Transportation"],
  datasets: [
    {
      label: "Expenses",
      data: [1200, 300, 150, 180, 100],
      backgroundColor: ["rgba(255, 99, 132, 0.2)"],
      borderColor: ["rgba(54, 162, 235, 1)"],
      borderWidth: 1,
    },
  ],
};

export const pieChartData = {
  labels: ["Facebook", "Instagram", "Twitter", "YouTube", "LinkedIn"],
  datasets: [
    {
      label: "Time Spent",
      data: [120, 60, 30, 90, 45],
      backgroundColor: [
        "rgba(255, 99, 132, 0.7)",
        "rgba(54, 162, 235, 0.7)",
        "rgba(255, 206, 86, 0.7)",
        "rgba(75, 192, 192, 0.7)",
        "rgba(153, 102, 255, 0.7)",
      ],
      hoverOffset: 4,
    },
  ],
};
