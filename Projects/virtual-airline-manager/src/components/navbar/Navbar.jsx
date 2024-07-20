import { React, useEffect, useState } from "react";
import { FaSitemap } from "react-icons/fa";
import "./Navbar.css";

const Navbar = () => {
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
          <li className="active-tab" id="nav-1">
            Home
          </li>
          <li className="navbar-center-ul-item" id="nav-2">
            About
          </li>
          <li className="navbar-center-ul-item" id="nav-3">
            Join Us
          </li>
          <li className="navbar-center-ul-item" id="nav-4">
            Agreement
          </li>
          <li className="navbar-center-ul-item" id="nav-5">
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
