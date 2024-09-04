import { useState } from "react";
import Navbar from "./components/navbar/Navbar";

function App() {
  const [isSignedIn, setIsSignedIn] = useState(true);
  return (
    <div className="App">
      <Navbar isSignedIn={isSignedIn} setIsSignedIn={setIsSignedIn} />
    </div>
  );
}

export default App;
