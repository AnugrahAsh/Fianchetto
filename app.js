const express = require('express');
const socket = require('socket.io');
const http = require('http');
const { Chess } = require('chess.js');
const path = require('path');
const mongoose = require('mongoose');
const User = require('./models/user')

const bodyParser = require('body-parser');


mongoose.connect('mongodb://localhost:27017/Fianchetto');
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/gameroom', (req, res) => {
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

    // uniqueSocket.on('chatMessage',({message})=>{
    //     io.emit('message', message);
    // })

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
app.get('/', (req, res) => {
    res.render('home', { title: "Fianchetto" });
});

app.get('/login', (req, res)=>{
    res.render('login');
})

app.get('/register', (req, res)=>{
    res.render('register');
})

app.post('/games', async(req, res)=>{
    const { email, username, password } = req.body.user;
    const user = new User({ email, username, password });
    await user.save();
    res.redirect('/');
})

app.get('*', (req, res)=>{
    res.render('pageNotFound')
})

server.listen(3000, () => {
    console.log("Listening on port 3000");
});