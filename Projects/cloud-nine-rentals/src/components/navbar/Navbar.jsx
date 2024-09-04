import "./Navbar.css";
import NavUserCtls from "./NavUserCtls";

function Navbar({ isSignedIn, setIsSignedIn }) {
  return (
    <div className="Navbar">
      <h1 className="navbar-title dancing-script-bold">Cloud Nine Rentals</h1>
      <ul className="navbar-list">
        <li className="abel-bold navbar-list-item">Dashboard</li>
        <li className="abel-bold navbar-list-item">Services</li>
        <li className="abel-bold navbar-list-item">Bookings</li>
        <li className="abel-bold navbar-list-item">My Account</li>
      </ul>
      <NavUserCtls />
    </div>
  );
}

export default Navbar;
