import "./Navbar.css";
import { FaUser } from "react-icons/fa";
import { IoIosLogOut } from "react-icons/io";

function Navbar() {
  return (
    <div className="Navbar">
      <h1 className="navbar-title dancing-script-bold">Cloud Nine Rentals</h1>
      <ul className="navbar-list">
        <li className="abel-bold navbar-list-item">Dashboard</li>
        <li className="abel-bold navbar-list-item">Services</li>
        <li className="abel-bold navbar-list-item">Bookings</li>
        <li className="abel-bold navbar-list-item">My Account</li>
      </ul>
      <div className="navbar-user-con">
        <FaUser
          style={{ color: "#c5a880", fontSize: "24px", margin: "0px 25px" }}
        />
        <button className="abel-bold button navbar-user-logout-button">
          Logout{" "}
          <IoIosLogOut
            style={{
              color: "#c5a880",
              verticalAlign: "middle",
              fontSize: "20px",
            }}
          />
        </button>
      </div>
    </div>
  );
}

export default Navbar;
