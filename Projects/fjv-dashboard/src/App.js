/*
  App component.
    -> Navbar component.
      -> Main component.
        -> Header component
        -> Dashboard component.
    -> Footer component.
*/
import "./App.css";
import Navbar from "./components/navbar/Navbar";

function App() {
  return (
    <div className="App">
      <Navbar />
    </div>
  );
}

export default App;
