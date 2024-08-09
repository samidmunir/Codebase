import React from "react";
import "./RoutesPanel.css";
import { routeData } from "../../utils/RouteData";
import RouteStrip from "../routeStrip/RouteStrip";

const RoutesPanel = () => {
  return (
    <div className="RoutesPanel">
      <div className="routes-panel-header">
        <h1 className="routes-panel-title">Explore the world with FJV</h1>
        <h2 className="routes-panel-subtitle">Fly Jinnah Virtual Routes</h2>
      </div>
      <div className="routes-panel-header-row">
        <RouteStrip
          flightNum="Flight No."
          model="Model"
          departure="Departure"
          arrival="Arrival"
          depTime="Departure Time"
          arrTime="Arrival Time"
        />
      </div>
      <div className="routes-panel-body">
        {routeData.map((route) => (
          <RouteStrip
            flightNum={route.flightNum}
            model={route.model}
            departure={route.departure}
            arrival={route.arrival}
            depTime={route.depTime}
            arrTime={route.arrTime}
          />
        ))}
      </div>
    </div>
  );
};

export default RoutesPanel;
