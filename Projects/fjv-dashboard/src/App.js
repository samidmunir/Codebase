/*
  App component.
    -> Navbar component.
    -> Main component.
      -> Header component
      -> Dashboard component.
    -> Footer component.
*/
import { useState } from "react";
import "./App.css";
import Navbar from "./components/navbar/Navbar";

function App() {
  const [toggleState, setToggleState] = useState(1);

  const toggleTab = (index) => {
    setToggleState(index);
  };
  return (
    <div className="App">
      <Navbar />
    </div>
  );
}

export default App;
