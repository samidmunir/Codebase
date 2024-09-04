import "./NavUserCtls.css";
import { FaUser } from "react-icons/fa";
import { IoIosLogOut } from "react-icons/io";

function NavUserCtls() {
  return (
    <div className="NavUserCtls">
      <FaUser
        style={{ color: "#c5a880", fontSize: "24px", margin: "0px 25px" }}
        onClick={() => alert("my profile")}
      />
      <button
        className="abel-bold button navbar-user-logout-button"
        onClick={() => alert("logging out")}
      >
        Logout
        <IoIosLogOut
          style={{
            color: "#c5a880",
            verticalAlign: "middle",
            fontSize: "20px",
            marginLeft: "5px",
          }}
        />
      </button>
    </div>
  );
}

export default NavUserCtls;
