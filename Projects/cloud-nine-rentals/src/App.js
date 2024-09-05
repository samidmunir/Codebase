import { useState } from "react";
import Navbar from "./components/navbar/Navbar";
import Footer from "./components/footer/Footer";
import MainContainer from "./components/main-container/MainContainer";

import user from "./data";

function App() {
  const [isSignedIn, setIsSignedIn] = useState(true);
  const [activeListItem, setActiveListItem] = useState(1);

  const userData = user;

  return (
    <div className="App">
      <Navbar
        isSignedIn={isSignedIn}
        setIsSignedIn={setIsSignedIn}
        activeListItem={activeListItem}
        setActiveListItem={setActiveListItem}
        userData={userData}
      />
      <MainContainer activeListItem={activeListItem} userData={userData} />
      <Footer />
    </div>
  );
}

export default App;
