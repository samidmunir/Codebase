import "./Dashboard.css";
import UpcomingTrip from "./upcoming-trip/UpcomingTrip";

function Dashboard({ userData }) {
  return (
    <div className="Dashboard">
      <h1 className="dancing-script-regular dashboard-title">
        Welcome, {userData.firstName}
      </h1>
      <div className="dashboard-flex-con">
        <div className="dashboard-flex-con-cols col1">
          <UpcomingTrip userData={userData} />
          {/* <h1 className="abel-bold">Upcoming Trip</h1> */}
        </div>
        <div className="dashboard-flex-con-cols col2">
          <div className="col2-top">col-top</div>
          <div className="col2-bottom">col-bottom</div>
        </div>
        <div className="dashboard-flex-con-cols col3">
          <h1 className="abel-bold">Profile Card</h1>
        </div>
      </div>
      <div className="dashboard-bottom-long-con">
        <h1 className="abel-bold">Dashboard Bottom Long</h1>
      </div>
    </div>
  );
}

export default Dashboard;
