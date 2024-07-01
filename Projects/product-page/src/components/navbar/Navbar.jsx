import React from "react";

const navItems = [
  { title: "Home", isActive: false },
  { title: "About", isActive: false },
  { title: "Products", isActive: true },
];

const Navbar = () => {
  return (
    <div className="navbar">
      <div>
        <h1>Breezy Solutions</h1>
      </div>
    </div>
  );
};

export default Navbar;
