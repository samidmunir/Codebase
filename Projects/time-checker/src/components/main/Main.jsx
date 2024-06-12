import "./Main.css";
import hd_background_img from "../../assets/hd-background.webp";

export default function Main() {
  return (
    <div className="Main">
      <div className="main-section">
        <h1>Current time</h1>
        <div className="main-section-image">
          <img src={hd_background_img} alt="high definition background" />
        </div>
        <p>Current location</p>
      </div>
    </div>
  );
}
