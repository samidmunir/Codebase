import "./Navbar.css";

function Navbar() {
  return (
    <div className="Navbar">
      <div className="navbar-title-con">
        <h1 className="navbar-title dancing-script-bold">Cloud Nine Rentals</h1>
      </div>
      <div className="navbar-list-con">
        <ul className="navbar-list">
          <li className="abel-regular navbar-list-item">Dashboard</li>
          <li className="abel-regular navbar-list-item">Services</li>
          <li className="abel-regular navbar-list-item">Bookings</li>
          <li className="abel-regular navbar-list-item">My Account</li>
        </ul>
      </div>
      <div className="navbar-user-con"></div>
    </div>
  );
}

export default Navbar;
