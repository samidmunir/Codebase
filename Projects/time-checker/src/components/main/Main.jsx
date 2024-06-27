import { useEffect, useState } from "react";
import "./Main.css";

export default function Main() {
  const [time, setTime] = useState(Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);
  return (
    <div className="Main">
      <div className="main-section">
        <h1>{time.substring(25)}</h1>
        <h2>{time.substring(0, 15)}</h2>
        <div className="time-container">
          <p>{time.substring(15, 25)}</p>
        </div>
      </div>
    </div>
  );
}
