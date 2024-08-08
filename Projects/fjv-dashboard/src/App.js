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
import Footer from "./components/footer/Footer";

function App() {
  return (
    <div className="App">
      <Navbar />
      <Footer />
    </div>
  );
}

export default App;
