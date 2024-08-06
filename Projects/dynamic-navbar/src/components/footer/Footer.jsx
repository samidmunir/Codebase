import React from "react";
import "./Footer.css";
import { FaRegHeart } from "react-icons/fa";

const Footer = () => {
  return (
    <div className="Footer">
      <p>
        Made with love - S.M.{" "}
        <span className="footer-icon">
          <FaRegHeart />
        </span>
      </p>
    </div>
  );
};

export default Footer;
