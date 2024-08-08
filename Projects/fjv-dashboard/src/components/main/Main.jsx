import React from "react";
import "./Main.css";
import Overview from "../overview/Overview";

const Main = (props) => {
  const currentTab = props.currentTab;
  return <div className="Main">{currentTab === 1 && <Overview />}</div>;
};

export default Main;
