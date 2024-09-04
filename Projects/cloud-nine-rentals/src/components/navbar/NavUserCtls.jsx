import "./NavUserCtls.css";
import { FaUser } from "react-icons/fa";
import { IoIosLogIn, IoIosLogOut } from "react-icons/io";
import { FaChalkboardUser } from "react-icons/fa6";

function NavUserCtls({ isSignedIn, setIsSignedIn }) {
  return (
    <div className="NavUserCtls">
      {isSignedIn ? (
        <div className="nav-user-logged-in">
          <FaUser
            style={{ color: "#c5a880", fontSize: "24px", margin: "0px 25px" }}
            onClick={() => alert("my profile")}
          />
          <button
            className="abel-bold button navbar-user-logout-button"
            onClick={() => setIsSignedIn(false)}
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
      ) : (
        <div className="nav-user-logged-out">
          <button className="abel-bold button navbar-user-signup-button">
            Sign Up
            <FaChalkboardUser
              style={{
                color: "#c5a880",
                verticalAlign: "middle",
                fontSize: "20px",
                marginLeft: "5px",
              }}
            />
          </button>
          <button
            className="abel-bold button navbar-user-login-button"
            onClick={() => setIsSignedIn(true)}
          >
            Login
            <IoIosLogIn
              style={{
                color: "#c5a880",
                verticalAlign: "middle",
                fontSize: "20px",
                marginLeft: "5px",
              }}
            />
          </button>
        </div>
      )}
    </div>
  );
}

export default NavUserCtls;
