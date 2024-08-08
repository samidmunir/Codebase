import React from "react";
import "./Footer.css";
import { FaCopyright } from "react-icons/fa";

const Footer = () => {
  return (
    <div className="Footer">
      <div className="footer-con">
        <p className="footer-p-1">Made with Love - S.M.</p>
        <p className="footer-p-2">
          Est. 2024{" "}
          <FaCopyright
            style={{
              marginLeft: "5px",
              fontSize: "14px",
            }}
          />
        </p>
      </div>
    </div>
  );
};

export default Footer;
