import React from "react";
import "./RouteStrip.css";

const RouteStrip = (props) => {
  return (
    <div className="RouteStrip">
      <div className="flightNum">{props.flightNum}</div>
      <div className="model">{props.model}</div>
      <div className="departure">{props.departure}</div>
      <div className="arrival">{props.arrival}</div>
      <div className="depTime">{props.depTime}</div>
      <div className="arrTime">{props.arrTime}</div>
    </div>
  );
};

export default RouteStrip;
