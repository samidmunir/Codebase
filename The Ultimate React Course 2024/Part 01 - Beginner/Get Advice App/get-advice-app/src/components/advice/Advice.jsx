import React from "react";
import "./Advice.css";

const Advice = (props) => {
  return (
    <div className="advice">
      <h1>{props.advice}</h1>
    </div>
  );
};

export default Advice;
