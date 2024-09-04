import "./Dashboard.css";

function Dashboard() {
  return (
    <div className="Dashboard">
      <h1 className="dancing-script-regular dashboard-title">
        Welcome to your Dashboard
      </h1>
      <div className="dashboard-flex-con">
        <div className="dashboard-flex-con-cols col1"></div>
        <div className="dashboard-flex-con-cols col2">
          <div className="col2-top"></div>
          <div className="col2-bottom"></div>
        </div>
        <div className="dashboard-flex-con-cols col3"></div>
      </div>
      <div className="dashboard-bottom-long-con"></div>
    </div>
  );
}

export default Dashboard;
