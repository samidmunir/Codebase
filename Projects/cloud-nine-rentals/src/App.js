import { useState } from "react";
import Navbar from "./components/navbar/Navbar";

function App() {
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [activeListItem, setActiveListItem] = useState(1);
  return (
    <div className="App">
      <Navbar
        isSignedIn={isSignedIn}
        setIsSignedIn={setIsSignedIn}
        activeListItem={activeListItem}
        setActiveListItem={setActiveListItem}
      />
    </div>
  );
}

export default App;
