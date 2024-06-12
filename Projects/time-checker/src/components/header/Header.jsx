import "./Header.css";
import { CiTimer } from "react-icons/ci";

export default function Header() {
  return (
    <div className="Header">
      <div className="header-logo">
        <h1>
          Time Checker
          <span>
            <CiTimer />
          </span>
        </h1>
      </div>
      <div className="header-main">
        <h1>Breezy Dev Inc.</h1>
      </div>
    </div>
  );
}
