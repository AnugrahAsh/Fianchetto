const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.get('/', (req, res) => {
    res.render('index', { title: "Chess Game" });
});

io.on("connection", function (uniqueSocket) {
    console.log("Connected");

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    } else {
        uniqueSocket.emit("spectatorRole");
    }

    uniqueSocket.on('chatMessage',({message})=>{
        io.emit('message', message);
    })

    uniqueSocket.on("disconnect", () => {
        if (uniqueSocket.id === players.white) {
            delete players.white;
        }
        if (uniqueSocket.id === players.black) {
            delete players.black;
        }
    });

    uniqueSocket.on("move", (move) => {
        try {
            if ((chess.turn() === 'w' && uniqueSocket.id !== players.white) ||
                (chess.turn() === 'b' && uniqueSocket.id !== players.black)) return;

            const result = chess.move(move);
            if (result) {
                currentPlayer = chess.turn();
                io.emit("move", move);
                io.emit("boardState", chess.fen());
            } else {
                console.log("Invalid Move:", move);
                uniqueSocket.emit("invalidMove", move);
            }
        } catch (err) {
            console.log(err);
            uniqueSocket.emit("invalidMove", move);
        }
    });
});

server.listen(3000, () => {
    console.log("Listening on port 3000");
});