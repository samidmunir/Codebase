import { useState } from "react";
import Navbar from "./components/navbar/Navbar";
import Footer from "./components/footer/Footer";
import MainContainer from "./components/main-container/MainContainer";

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
      <MainContainer activeListItem={activeListItem} />
      <Footer />
    </div>
  );
}

export default App;
