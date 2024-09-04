import "./MainContainer.css";

function MainContainer({ activeListItem }) {
  return (
    <div className="MainContainer">
      <h1>{activeListItem === 1 ? "Dashboard" : null}</h1>
      <h1>{activeListItem === 2 ? "Services" : null}</h1>
      <h1>{activeListItem === 3 ? "Bookings" : null}</h1>
      <h1>{activeListItem === 4 ? "My Account" : null}</h1>
    </div>
  );
}

export default MainContainer;
