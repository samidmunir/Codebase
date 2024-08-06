import React from "react";
import "./Home.css";
import Chart from "chart.js/auto";
import { CategoryScale } from "chart.js/auto";

Chart.register(CategoryScale);

const Home = () => {
  return (
    <div className="Home">
      <div className="header">
        <h1 className="header-title">My Dashboard</h1>
      </div>
      <div className="dashboard">
        <div className="dashboard-col dashboard-col-left">
          <h1>Top Services</h1>
          <ul className="top-services-list">
            <li className="top-services-list-item">Computer Science</li>
            <li className="top-services-list-item">Tutoring + Education</li>
            <li className="top-services-list-item">Projects + Coursework</li>
            <li className="top-services-list-item">Full-stack Development</li>
          </ul>
        </div>
        <div className="dashboard-col dashboard-col-center">
          <h1>Overview</h1>
          <p>
            Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi
            obcaecati optio, exercitationem laboriosam, quod possimus ullam ex,
            esse dolorum voluptas aliquid laudantium rerum culpa? Aspernatur
            velit aut a illum iusto.
          </p>
          <ul className="overview-list">
            <li className="overview-list-item">Front-end</li>
            <li className="overview-list-item">Systems Programming</li>
            <li className="overview-list-item">Back-end</li>
            <li className="overview-list-item">Computer Architecture</li>
            <li className="overview-list-item">Integration Testing</li>
            <li className="overview-list-item">Cloud Solutions</li>
          </ul>
        </div>
        <div className="dashboard-col dashboard-col-right">
          <h1>Statistics</h1>
        </div>
      </div>
    </div>
  );
};

export default Home;
