import React from "react";
import "./Overview.css";
import PilotCard from "../pilotCard/PilotCard";

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
              <li className="flights-list-item">FJL235 | OPKC - OPIS</li>
              <li className="flights-list-item">FJL307 | OPKC - OOMS</li>
              <li className="flights-list-item">FJL236 | OPIS - OPKC</li>
              <li className="flights-list-item">FJL417 | OPKC - OMDB</li>
            </ul>
          </div>
        </div>
        <div className="notams-con">
          <PilotCard />
        </div>
      </div>
    </div>
  );
};

export default Overview;
