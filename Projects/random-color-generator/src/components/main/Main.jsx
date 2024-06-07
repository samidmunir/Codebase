import {useEffect, useState} from "react";
import "./Main.css";

export default function Main() {

    const [color, setColor] = useState("");

    async function getColor() {
        const res = await fetch("https://x-colors.yurace.pro/api/random");
        const data = await res.json();
        setColor(data.hex);
    }

    useEffect(function() {
        getColor();
    }, []);

    return (
        <div id="Main">
            <h1>{color}</h1>
            <div id="color-con" style={{backgroundColor: color}}></div>
            <button onClick={getColor}>Generate random color</button>
        </div>
    );
}