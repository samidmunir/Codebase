import { useState } from "react";
import "./Navbar.css";
import NavUserCtls from "./NavUserCtls";
import { MdDashboard } from "react-icons/md";
import { FaServicestack } from "react-icons/fa";
import { IoBookmarksSharp } from "react-icons/io5";
import { MdManageAccounts } from "react-icons/md";

function Navbar({ isSignedIn, setIsSignedIn }) {
  const [activeListItem, setActiveListItem] = useState(1);
  return (
    <div className="Navbar">
      <h1 className="navbar-title dancing-script-bold">Cloud Nine Rentals</h1>
      <ul className="navbar-list">
        <li
          style={{ color: "#c5a880", fontSize: "18px", margin: "0px 25px" }}
          className={
            activeListItem === 1
              ? "abel-bold active-list-item"
              : "abel-bold navbar-list-item"
          }
          onClick={() => setActiveListItem(1)}
        >
          Dashboard{" "}
          <MdDashboard
            style={{
              color: "#c5a880",
              fontSize: "18px",
              verticalAlign: "middle",
            }}
          />
        </li>
        <li
          style={{ color: "#c5a880", fontSize: "18px", margin: "0px 25px" }}
          className={
            activeListItem === 2
              ? "abel-bold active-list-item"
              : "abel-bold navbar-list-item"
          }
          onClick={() => setActiveListItem(2)}
        >
          Services{" "}
          <FaServicestack
            style={{
              color: "#c5a880",
              fontSize: "18px",
              verticalAlign: "middle",
            }}
          />
        </li>
        <li
          style={{ color: "#c5a880", fontSize: "18px", margin: "0px 25px" }}
          className={
            activeListItem === 3
              ? "abel-bold active-list-item"
              : "abel-bold navbar-list-item"
          }
          onClick={() => setActiveListItem(3)}
        >
          Bookings{" "}
          <IoBookmarksSharp
            style={{
              color: "#c5a880",
              fontSize: "18px",
              verticalAlign: "middle",
            }}
          />
        </li>
        <li
          style={{ color: "#c5a880", fontSize: "18px", margin: "0px 25px" }}
          className={
            activeListItem === 4
              ? "abel-bold active-list-item"
              : "abel-bold navbar-list-item"
          }
          onClick={() => setActiveListItem(4)}
        >
          My Account{" "}
          <MdManageAccounts
            style={{
              color: "#c5a880",
              fontSize: "18px",
              verticalAlign: "middle",
            }}
          />
        </li>
      </ul>
      <NavUserCtls isSignedIn={isSignedIn} setIsSignedIn={setIsSignedIn} />
    </div>
  );
}

export default Navbar;
