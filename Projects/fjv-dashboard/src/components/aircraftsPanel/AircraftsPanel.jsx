import React from "react";
import "./AircraftsPanel.css";
import Aircraft from "../aircraft/Aircraft";
import { aircraftsData } from "../../utils/AircraftData";

const AircraftsPanel = () => {
  return (
    <div className="AircraftsPanel">
      <div className="aircrafts-panel-title-con">
        <h1 className="aircrafts-panel-title">Fly Jinnah Virtual Fleet</h1>
        <h2 className="aircrafts-panel-title-2">Aircrafts</h2>
      </div>
      <div className="aircrafts-panel-aircraft-con">
        {aircraftsData.map((aircraft) => (
          <Aircraft
            className="aircraft-card"
            registration={aircraft.registration}
            model={aircraft.model}
            flightNum={aircraft.flightNum}
            progressVal={aircraft.progressVal}
            departure={aircraft.departure}
            arrival={aircraft.arrival}
          />
        ))}
      </div>
      <div className="aircrafts-panel-aircrafts-stats-con"></div>
    </div>
  );
};

export default AircraftsPanel;
