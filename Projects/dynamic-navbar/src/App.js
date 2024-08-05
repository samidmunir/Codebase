import "./App.css";
import { React, useState } from "react";
import Header from "./components/header/Header";
import Home from "./components/home/Home";
import Services from "./components/services/Services";

function App() {
  const [toggleState, setToggleState] = useState(1);

  const toggleTab = (index) => {
    setToggleState(index);
  };

  return (
    <div className="App">
      <Header />
      <div className="Navbar">
        <ul>
          <li
            className={toggleState === 1 ? "active-tab" : "navbar-item"}
            id="nav-home"
            onClick={() => toggleTab(1)}
          >
            Home
          </li>
          <li
            className={toggleState === 2 ? "active-tab" : "navbar-item"}
            id="nav-services"
            onClick={() => toggleTab(2)}
          >
            Services
          </li>
          <li
            className={toggleState === 3 ? "active-tab" : "navbar-item"}
            id="nav-about"
            onClick={() => toggleTab(3)}
          >
            About
          </li>
          <li
            className={toggleState === 4 ? "active-tab" : "navbar-item"}
            id="nav-contact"
            onClick={() => toggleTab(4)}
          >
            Contact
          </li>
        </ul>
      </div>
      <div className="Main">
        {toggleState === 1 && <Home />}
        {toggleState === 2 && <Services />}
      </div>
    </div>
  );
}

export default App;
