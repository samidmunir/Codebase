import "./Main.css";
import hdBackgroundImg from "../../assets/hd-background.webp";

export default function Main() {
  return (
    <div className="Main">
      <div className="main-section">
        <h1>Eastern Standard Time</h1>
      </div>
      <div className="main-section-img-con">
        <img src={hdBackgroundImg} alt="beautiful background" />
      </div>
    </div>
  );
}
