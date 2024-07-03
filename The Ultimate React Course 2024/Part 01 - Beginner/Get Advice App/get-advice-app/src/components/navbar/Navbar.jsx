import React from "react";
import "./Navbar.css";
import { DiNetbeans } from "react-icons/di";
import { FcAbout } from "react-icons/fc";

const navbarListItems = [
  { title: "About", id: 0 },
  { title: "Projects", id: 1 },
  { title: "Contact", id: 2 },
];

const Navbar = () => {
  return (
    <div className="navbar">
      <div className="navbar-left">
        <h1 id="navbar-title">Breezy Dev Inc</h1>
        <h1 id="navbar-title-logo">
          <DiNetbeans />
        </h1>
      </div>
      <div className="navbar-right">
        <h1 id="navbar-title-2">Get some advice</h1>
        <h1 id="navbar-title-logo-2">
          <FcAbout />
        </h1>
        <ul className="navbar-list">
          {navbarListItems.map((navbarListItem) => {
            return (
              <li key={navbarListItem.id} className="navbar-list-item">
                {navbarListItem.title}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
