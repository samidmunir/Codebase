import React from "react";
import { DiCodepen } from "react-icons/di";
import "./Navbar.css";

const navItems = [
  { id: 0, title: "Home", isActive: false },
  { id: 1, title: "About", isActive: false },
  { id: 2, title: "Products", isActive: true },
];

const Navbar = () => {
  return (
    <div className="navbar">
      <div>
        <h1 id="navbar-title">
          Breezy Solutions{" "}
          <span id="navbar-title-logo">
            <DiCodepen />
          </span>
        </h1>
      </div>
      <ul id="navbar-items-list">
        {navItems.map((item) => {
          return (
            <li key={item.id} className="navbar-items">
              {item.title}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Navbar;
