import React from "react";
import "./Aircraft.css";

const Aircraft = (props) => {
  return (
    <div className="Aircraft">
      <div className="aircraft-data-con">
        <div className="aircraft-name-model-con">
          <h1 className="aircraft-registration">{props.registration}</h1>
          <h1>{props.model}</h1>
        </div>
        <div className="aircraft-status-con">
          <h2>{props.flightNum}</h2>
          <RouteProgressBar
            departure={props.departure}
            progressVal={props.progressVal}
            arrival={props.arrival}
          />
        </div>
      </div>
    </div>
  );
};

const RouteProgressBar = (props) => {
  return (
    <div className="RouteProgressBar">
      <div className="route-departure-con">
        <p>{props.departure}</p>
      </div>
      <div className="route-progress-bar">
        <div
          className="route-progress"
          style={{ width: props.progressVal }}
        ></div>
      </div>
      <div className="route-arrival-con">
        <p>{props.arrival}</p>
      </div>
    </div>
  );
};

export default Aircraft;
