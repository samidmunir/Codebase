import "./Header.css";
import { IoIosColorPalette } from "react-icons/io";
import { DiTerminal } from "react-icons/di";

export default function Header() {
    return (
        <div id="Header">
            <div className="column">
                <h1>Random Color Generator <span><IoIosColorPalette/></span></h1>
            </div>
            <div className="column">
                <h2>Dev | Sami Munir <span><DiTerminal/></span></h2>
            </div>
        </div>
    );
}