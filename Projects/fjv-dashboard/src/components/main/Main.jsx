import React from "react";
import "./Main.css";
import Overview from "../overview/Overview";
import AircraftsPanel from "../aircraftsPanel/AircraftsPanel";
import RoutesPanel from "../routesPanel/RoutesPanel";

const Main = (props) => {
  const currentTab = props.currentTab;
  return (
    <div className="Main">
      {currentTab === 1 && <Overview />}
      {currentTab === 2 && <AircraftsPanel />}
      {currentTab === 3 && <RoutesPanel />}
    </div>
  );
};

export default Main;
