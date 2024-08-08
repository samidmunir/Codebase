import { React, useState } from "react";
import "./Navbar.css";
import { IoAirplaneSharp } from "react-icons/io5";

const Navbar = () => {
  const [toggleState, setToggleState] = useState(1);

  const toggleTab = (index) => {
    setToggleState(index);
    console.log(index);
  };
  return (
    <div className="Navbar">
      <div className="navbar-title-con">
        <h1 className="navbar-title">Fly Jinnah Virtual</h1>
        <IoAirplaneSharp style={{ fontSize: "36px" }} />
      </div>
      <div className="navbar-items-con">
        <ul className="navbar-items-list">
          <li
            className={toggleState === 1 ? "active-tab" : "navbar-item"}
            id="nav-overview"
            onClick={() => toggleTab(1)}
          >
            Overview
          </li>
          <li
            className={toggleState === 2 ? "active-tab" : "navbar-item"}
            id="nav-aircrafts"
            onClick={() => toggleTab(2)}
          >
            Aircrafts
          </li>
          <li
            className={toggleState === 3 ? "active-tab" : "navbar-item"}
            id="nav-routes"
            onClick={() => toggleTab(3)}
          >
            Routes
          </li>
          <li
            className={toggleState === 4 ? "active-tab" : "navbar-item"}
            id="nav-flights"
            onClick={() => toggleTab(4)}
          >
            Flights
          </li>
          <li
            className={toggleState === 5 ? "active-tab" : "navbar-item"}
            id="nav-notams"
            onClick={() => toggleTab(5)}
          >
            NOTAMS
          </li>
          <li
            className={toggleState === 6 ? "active-tab" : "navbar-item"}
            id="nav-statistics"
            onClick={() => toggleTab(6)}
          >
            Statistics
          </li>
          <li
            className={toggleState === 7 ? "active-tab" : "navbar-item"}
            id="nav-wallet"
            onClick={() => toggleTab(7)}
          >
            Wallet
          </li>
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
