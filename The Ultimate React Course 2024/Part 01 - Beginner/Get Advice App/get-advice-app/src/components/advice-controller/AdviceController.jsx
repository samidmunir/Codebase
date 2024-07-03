import React from "react";
import "./AdviceController.css";

const AdviceController = (props) => {
  return (
    <div className="advice-controller">
      <button id="advice-controller-button" onClick={props.getAdviceFunc}>
        Get Advice
      </button>
      <p id="advice-controller-message">
        You have read <strong>{props.count}</strong> pieces of advice.
      </p>
    </div>
  );
};

export default AdviceController;
