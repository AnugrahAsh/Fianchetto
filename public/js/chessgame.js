const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

let whiteTime = 600; // 10 minutes in seconds
let blackTime = 600;
let whiteTimerInterval;
let blackTimerInterval;
let currentPlayer;


const startTimer = (player) => {
    if (player === 'w') {
        clearInterval(blackTimerInterval);
        whiteTimerInterval = setInterval(() => {
            whiteTime--;
            updateTimerDisplay('white-timer', whiteTime);
            if (whiteTime <= 0) {
                clearInterval(whiteTimerInterval);
                alert("Black wins!");
            }
        }, 1000);
        currentPlayer = player;
    } else {
        clearInterval(whiteTimerInterval);
        blackTimerInterval = setInterval(() => {
            blackTime--;
            updateTimerDisplay('black-timer', blackTime);
            if (blackTime <= 0) {
                clearInterval(blackTimerInterval);
                alert("White wins!");
            }
        }, 1000);
        currentPlayer = player;
    }
}

const stopTimer = () => {
    clearInterval(currentPlayer === 'w' ? whiteTimerInterval : blackTimerInterval);
}




const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowIndex + squareIndex) % 2 === 0 ? "light" : "dark");

            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

                pieceElement.addEventListener("dragstart", (e) => {
                    if (pieceElement.draggable) {
                        draggedPiece = pieceElement;
                        sourceSquare = { row: rowIndex, col: squareIndex };
                        e.dataTransfer.setData("text/plain", "");
                    }
                });

                pieceElement.addEventListener("dragend", (e) => {
                    draggedPiece = null;
                    sourceSquare = null;
                });
                squareElement.append(pieceElement);
            }

            squareElement.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            squareElement.addEventListener("drop", (e) => {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col),
                    };

                    handleMove(sourceSquare, targetSquare);
                }
            });
            boardElement.append(squareElement);
        });
    });

    if (playerRole === "b") {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }

};

// const handleMove = (source, target) => {
//     const move = {
//         from: ${String.fromCharCode(97 + source.col)}${8 - source.row},
//         to: ${String.fromCharCode(97 + target.col)}${8 - target.row},
//         promotion: 'q',  // always promote to queen for simplicity
//     };

//     if (chess.move(move)) {
//         socket.emit("move", move);
//         renderBoard();
//     } else {
//         renderBoard(); // Invalid move, just re-render the board
//     }
// };

const handleMove = (source, target) => {
    const move = {
        from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
        to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
        promotion: 'q',
    };

    if (chess.move(move)) {
        socket.emit("move", move);
        stopTimer();
        currentPlayer = chess.turn();
        startTimer(currentPlayer);
        renderBoard();
    } else {
        renderBoard(); // Invalid move, just re-render the board
    }
};



const updateTimerDisplay = (elementId, time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    document.getElementById(elementId).innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}


const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♙",
        r: "♖",
        n: "♘",
        b: "♗",
        q: "♕",
        k: "♔",
        P: "♟",
        R: "♜",
        N: "♞",
        B: "♝",
        Q: "♛",
        K: "♚",
    };
    return unicodePieces[piece.type || ""];
};

socket.on("playerRole", (role) => {
    playerRole = role;
    renderBoard();
});

socket.on("spectatorRole", () => {
    playerRole = null;
    if(playerRole === null){
        const chatbox = document.querySelector('.chatbox');
        chatbox.style.display="none";
    }
    renderBoard();
});

socket.on("boardState", (fen) => {
    chess.load(fen);
    renderBoard();
});

socket.on("move", (move) => {
    chess.move(move);
    stopTimer();
    currentPlayer = chess.turn();
    startTimer(currentPlayer);
    renderBoard();
});


renderBoard();