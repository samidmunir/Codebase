export const userData = {
  name: "Sami Munir",
  dob: "2001-10-11",
  email: "sami.munir2001@gmail.com",
  rank: "Senior First Officer",
  flights: 54,
  hours: 147,
  base: "Newark, New Jersey",
  homeAirport: "EWR",
  walletBalance: 630000,
  hoursToPromotion: 200,
  ratings: [
    "Boeing 737",
    "Airbus A320",
    "Airbus A330",
    "Boeing 777",
    "Boeing 787",
  ],
};

export const pilotHoursData = {
  labels: ["B737", "A320", "A330", "B777", "B787"],
  datasets: [
    {
      label: "Hours flown",
      data: [23, 25, 3, 49, 33],
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
