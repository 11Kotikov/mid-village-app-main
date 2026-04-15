import "./style.css";
import { Game } from "./app/Game";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const game = new Game(canvas);

game.start();