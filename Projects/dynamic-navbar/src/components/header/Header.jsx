import React from "react";
import "./Header.css";
import { DiAtom } from "react-icons/di";

const Header = () => {
  return (
    <div className="Header">
      <h1>
        Munir Code Forge{" "}
        <span>
          <DiAtom />
        </span>
      </h1>
      <h2>Sami Munir</h2>
    </div>
  );
};

export default Header;
