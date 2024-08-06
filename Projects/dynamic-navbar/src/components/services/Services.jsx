import React from "react";
import "./Services.css";

const Services = () => {
  return (
    <div className="Services">
      <div className="header">
        <h1 className="header-title">Services for You</h1>
      </div>
      <div className="services">
        <div className="services-col services-col-left">
          <h1>MCF Free Trial</h1>
        </div>
        <div className="services-col services-col-center">
          <h1>MCF Premium</h1>
        </div>
        <div className="services-col services-col-right">
          <h1>MCF Prestige</h1>
        </div>
      </div>
    </div>
  );
};

export default Services;
