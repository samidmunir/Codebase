import "./MainContainer.css";
import Dashboard from "../dashboard/Dashboard";

function MainContainer({ activeListItem, userData }) {
  return (
    <div className="MainContainer">
      {activeListItem === 1 && <Dashboard userData={userData} />}
      {activeListItem === 2 ? "Services" : null}
      {activeListItem === 3 ? "Bookings" : null}
      {activeListItem === 4 ? "My Account" : null}
    </div>
  );
}

export default MainContainer;
