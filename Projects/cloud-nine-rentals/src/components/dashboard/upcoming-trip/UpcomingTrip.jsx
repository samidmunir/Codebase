import "./UpcomingTrip.css";

function UpcomingTrip({ userData }) {
  return (
    <div className="UpcomingTrip">
      <p className="dancing-script-bold upcoming-trip-title">
        Your Upcoming Trip ✈️
      </p>
      <div className="upcoming-flight-con1">
        <p className="abel-bold upcoming-trip-flight-num">
          {userData.booking.flightNum}
        </p>
        <p className="abel-bold upcoming-trip-route">
          {userData.booking.departure} ➡️ {userData.booking.arrival}
        </p>
      </div>
      <div className="upcoming-flight-con2">
        <p className="abel-bold upcoming-trip-date">
          {userData.booking.depDate}
        </p>
        <p className="abel-bold upcoming-trip-countdown">
          {userData.booking.depCountdown} days remaining
        </p>
      </div>
      <p className="abel-bold upcoming-trip-flight-time">
        {userData.booking.flightDur}
      </p>
      <p className="abel-bold upcoming-trip-time">
        ETD: {userData.booking.etd}
      </p>
      <div className="upcoming-trip-buttons-con">
        <button>Quick view</button>
        <button>View booking</button>
        <button>Cancel trip</button>
      </div>
    </div>
  );
}

export default UpcomingTrip;
