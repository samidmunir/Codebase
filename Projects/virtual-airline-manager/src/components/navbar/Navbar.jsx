import React from "react";
import { FaThList } from "react-icons/fa";
import "./Navbar.css";

const Navbar = () => {
  return (
    <div className="Navbar">
      <div className="navbar-left">
        <h1 className="navbar-left-title">
          Virtual Airline Manager
          <span className="navbar-left-logo">
            <FaThList />
          </span>
        </h1>
      </div>
      <div className="navbar-center">
        <ul className="navbar-center-ul">
          <li>Home</li>
          <li>About</li>
          <li>Join Us</li>
          <li>Agreement</li>
          <li>Contact</li>
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
