import React from "react";
import "./Navbar.css";
import { IoAirplaneSharp } from "react-icons/io5";

const Navbar = () => {
  return (
    <div className="Navbar">
      <div className="navbar-title-con">
        <h1 className="navbar-title">Fly Jinnah Virtual</h1>
        <IoAirplaneSharp style={{ fontSize: "36px" }} />
      </div>
      <div className="navbar-items-con">
        <ul className="navbar-items-list">
          <li className="navbar-item active-tab">Overview</li>
          <li className="navbar-item">Aircrafts</li>
          <li className="navbar-item">Routes</li>
          <li className="navbar-item">Flights</li>
          <li className="navbar-item">Aircrafts</li>
          <li className="navbar-item">Statistics</li>
          <li className="navbar-item">Wallet</li>
        </ul>
      </div>
      <div className="navbar-buttons-con">
        <p className="navbar-welcome-mssg">Welcome, Sami</p>
        <button className="logout-btn">Logout</button>
      </div>
    </div>
  );
};

export default Navbar;
