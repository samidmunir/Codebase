import React from "react";
import { IoIosStar, IoIosStarHalf } from "react-icons/io";
import "./PilotCard.css";

const PilotCard = () => {
  return (
    <div className="PilotCard">
      <div className="pilot-card-con">
        <div className="pilot-deets1">
          <h1>Sami Munir</h1>
          <h2>Senior First Officer</h2>
          <h3>EWR - Newark, New Jersey</h3>
        </div>
        <div className="pilot-deets2">
          <h4>Balance: $630,000</h4>
          <ul className="aircraft-ratings-list">
            <li>B737</li>
            <li>A320</li>
            <li>A330</li>
            <li>B777</li>
            <li>B787</li>
          </ul>
          <ul className="pilot-star-list">
            <li>
              <IoIosStar />
            </li>
            <li>
              <IoIosStar />
            </li>
            <li>
              <IoIosStar />
            </li>
            <li>
              <IoIosStarHalf />
            </li>
          </ul>
        </div>
        <div className="pilot-deets3">
          <h5>2001-10-11</h5>
          <h5 className="pilot-email">sami.munir2001@gmail.com</h5>
          <p style={{ marginTop: "25px", fontWeight: "bold" }}>
            203 hours to promotion.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PilotCard;
