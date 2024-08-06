import { React, useState } from "react";
import "./App.css";
import Navbar from "./components/navbar/Navbar";
import Home from "./components/home/Home";
import About from "./components/about/About";
import Joinus from "./components/joinus/Joinus";
import Agreement from "./components/agreement/Agreement";
import Contact from "./components/contact/Contact";
import Footer from "./components/footer/Footer";

const App = () => {
  const [activeTab, setActiveTab] = useState(1);

  const handleTab = (index) => {
    setActiveTab(index);
  };
  return (
    <>
      <Navbar />
      <Home />
      <About />
      <Joinus />
      <Agreement />
      <Contact />
      <Footer />
    </>
  );
};

export default App;
