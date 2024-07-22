import { React, useEffect, useState } from "react";
import { FaSitemap } from "react-icons/fa";
import "./Navbar.css";

const Navbar = () => {
  const [toggleState, setToggleState] = useState(1);

  const toggleTab = (index) => {
    // alert(`index: ${index}`);
    setToggleState(index);
  };
  return (
    <div className="Navbar">
      <div className="navbar-left">
        <h1 className="navbar-left-title">
          Virtual Airline Manager
          <span className="navbar-left-logo">
            <FaSitemap />
          </span>
        </h1>
      </div>
      <div className="navbar-center">
        <ul className="navbar-center-ul">
          <li
            className={
              toggleState === 1 ? "active-tab" : "navbar-center-ul-item"
            }
            id="nav-1"
            onClick={() => toggleTab(1)}
          >
            Home
          </li>
          <li
            className={
              toggleState === 2 ? "active-tab" : "navbar-center-ul-item"
            }
            id="nav-2"
            onClick={() => toggleTab(2)}
          >
            About
          </li>
          <li
            className={
              toggleState === 3 ? "active-tab" : "navbar-center-ul-item"
            }
            id="nav-3"
            onClick={() => toggleTab(3)}
          >
            Join Us
          </li>
          <li
            className={
              toggleState === 4 ? "active-tab" : "navbar-center-ul-item"
            }
            id="nav-4"
            onClick={() => toggleTab(4)}
          >
            Agreement
          </li>
          <li
            className={
              toggleState === 5 ? "active-tab" : "navbar-center-ul-item"
            }
            id="nav-5"
            onClick={() => toggleTab(5)}
          >
            Contact
          </li>
        </ul>
      </div>
      <div className="navbar-right">
        <div className="navbar-right-login">
          <button className="navbar-login-btn1">Login</button>
          <button className="navbar-login-btn2">Sign Up</button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
