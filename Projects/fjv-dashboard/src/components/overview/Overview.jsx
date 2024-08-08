import React from "react";
import "./Overview.css";
import PilotCard from "../pilotCard/PilotCard";
import { PieChart } from "../pieChart/Pie";

const Overview = () => {
  return (
    <div className="Overview">
      <div className="overview-title-con">
        <h1>Dashboard</h1>
        <h2>Welcome to FJLV</h2>
      </div>
      <div className="overview-flex-con">
        <div className="pilot-con">
          <PilotCard />
        </div>
        <div className="active-flights-con">
          <h1>Active Flights</h1>
          <div className="flights-con">
            <ul className="flights-list">
              <li className="flights-list-item">FJL235 | OPKC - OPIS | A320</li>
              <li className="flights-list-item">FJL307 | OPKC - OOMS | A320</li>
              <li className="flights-list-item">FJL236 | OPIS - OPKC | A320</li>
              <li className="flights-list-item">FJL417 | OPKC - OMDB | B738</li>
            </ul>
          </div>
        </div>
        <div className="notams-con">
          <PieChart />
        </div>
      </div>
    </div>
  );
};

export default Overview;
