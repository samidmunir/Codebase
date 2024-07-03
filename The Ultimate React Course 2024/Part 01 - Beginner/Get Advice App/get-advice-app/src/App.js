import { useEffect, useState } from "react";
import "./App.css";
import Navbar from "./components/navbar/Navbar";
import Advice from "./components/advice/Advice";
import AdviceController from "./components/advice-controller/AdviceController";

export default function App() {
  const [advice, setAdvice] = useState("");
  const [count, setCount] = useState(0);

  async function getAdvice() {
    const res = await fetch("https://api.adviceslip.com/advice");
    const data = await res.json();
    setAdvice(data.slip.advice);
    setCount((c) => c + 1);
  }

  useEffect(function () {
    getAdvice();
  }, []);

  return (
    <div className="app">
      <Navbar />
      <Advice advice={advice} />
      <AdviceController count={count} getAdviceFunc={getAdvice} />
    </div>
  );
}
