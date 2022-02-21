"use strict";

if (!matchId) {
  location.replace("/");
}

document.querySelector("h1").addEventListener("click", () => {
  location.replace("/");
});

const tileClickListener = function (x, y) {
  return function (e) {
    if (y == board.cY) {
      board.cursor(x, y);
    }
  };
};

class Board {
  constructor(tilePrefab, rowPrefab, boardDom) {
    this.contents = Array(5 * 6).fill("");
    this.cX = 0;
    this.cY = 0;
    this.lockStatus = true;
    for (let j = 0; j < 6; j++) {
      let newRow = rowPrefab.cloneNode();
      newRow.id = `row${j}`;
      boardDom.appendChild(newRow);
      for (let i = 0; i < 5; i++) {
        let newTile = tilePrefab.cloneNode();
        newTile.id = `tile${i + j * 5}`;
        newTile.addEventListener("click", tileClickListener(i, j));
        newRow.appendChild(newTile);
      }
    }

    tilePrefab.classList.add("hidden");
    rowPrefab.classList.add("hidden");
  }

  toOrd(x, y) {
    return x + y * 5;
  }

  cOrd() {
    return this.toOrd(this.cX, this.cY);
  }

  getTile(x, y) {
    return document.getElementById(`tile${this.toOrd(x, y)}`);
  }

  getCursorTile() {
    return this.getTile(this.cX, this.cY);
  }

  getRow(y) {
    return document.getElementById(`row${y}`);
  }

  getCursorRow() {
    return document.getElementById(`row${this.cY}`);
  }

  lock() {
    this.lockStatus = true;
    this.hideCursor();
  }

  unlock() {
    this.lockStatus = false;
    this.showCursor();
  }

  hideCursor() {
    this.getCursorTile().classList.remove("tile-active");
  }

  showCursor() {
    this.getCursorTile().classList.add("tile-active");
    this.getCursorRow().classList.add("row-active");
  }

  cursor(x, y) {
    this.hideCursor();
    this.getCursorRow().classList.remove("row-active");
    this.cX = Math.max(0, Math.min(x, 5 - 1));
    this.cY = Math.max(0, Math.min(y, 6 - 1));
    this.getCursorRow().classList.add("row-active");
    if (!this.lockStatus) {
      this.showCursor();
    }
  }

  setChar(x, y, char) {
    if (!char.match(/^[a-zA-Z]$/)) return;
    char = char.toUpperCase();
    this.contents[this.toOrd(x, y)] = char;
    this.getTile(x, y).innerText = char;
  }

  type(char) {
    this.setChar(this.cX, this.cY, char);
    this.cursor(this.cX + 1, this.cY);
  }

  delete() {
    if (this.contents[this.cOrd()] === "") {
      this.cursor(this.cX - 1, this.cY);
    }
    this.contents[this.cOrd()] = "";
    this.getCursorTile().innerText = "";
  }

  colour(x, y, type) {
    this.getTile(x, y).classList.add(`tile-${type}`);
  }

  getWord() {
    let word = "";
    for (let i = 0; i < 5; i++) {
      word += this.contents[this.toOrd(i, this.cY)];
    }
    return word.toLowerCase();
  }

  updateContent(words, results, turn) {
    for (let i = 0; i < words.length; i++) {
      for (let j = 0; j < 5; j++) {
        this.setChar(j, i, words[i][j]);
        if (i < results.length) {
          this.colour(j, i, results[i][j]);
        }
      }
    }
    if (this.cY != turn) {
      this.cursor(0, turn);
    }
  }
}

const board = new Board(
  document.querySelector("#board .tile"),
  document.querySelector("#board .row"),
  document.querySelector("#board")
);

const keyListener = function (e) {
  if (board.lockStatus) {
    return;
  }
  if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || e.isComposing) {
    return;
  }
  if (e.key.match(/^[a-zA-Z]$/)) {
    board.type(e.key);
  }
  switch (e.key) {
    case " ":
    case "Tab":
      board.cursor(board.cX + 1, board.cY);
      break;
    case "Backspace":
    case "Delete":
      board.delete();
      break;
    case "ArrowLeft":
      board.cursor(board.cX - 1, board.cY);
      break;
    case "ArrowRight":
      board.cursor(board.cX + 1, board.cY);
      break;
    case "Home":
      board.cursor(0, board.cY);
      break;
    case "End":
      board.cursor(board.sizeX - 1, board.cY);
      break;
    case "Enter":
      if (board.getWord().length != 5) {
        break;
      }
      board.lock();
      submit();
      break;
  }
};

document.addEventListener("keydown", keyListener);

const submit = function () {
  socket.emit("move", { word: board.getWord(), matchId });
};

const token = localStorage.getItem("addle-token");

const socket = io("https://addle.glitch.me", {
  autoConnect: false,
});

socket.on("match-not-found", () => {
  location.replace("/");
});

socket.on("move-accepted", ({ word }) => {
  document.querySelector("#log p").innerText = `✔️ Move accepted! "${word}"`;
  socket.emit("match-fetch", { matchId });
});

socket.on("move-rejected", ({ reason }) => {
  document.querySelector(
    "#log p"
  ).innerText = `❌ Move rejected! Reason: ${reason}`;
  board.unlock();
});

socket.on("opponent-move", (args) => {
  if (matchId === args.matchId) {
    socket.emit("match-fetch", { matchId });
  }
});

const setOpponent = function (opponent) {
  document.querySelector("#opponent").innerText = opponent;
};

const setSide = function (side) {
  document.querySelector("#side-emoji").innerText =
    side === "guesser" ? "🔎" : "😈";
  document.querySelector("#side").innerText = side;
};

const setStatus = function (emoji, message) {
  document.querySelector("#status-emoji").innerText = emoji;
  document.querySelector("#status").innerText = message;
};

socket.on("match-fetch", ({ match }) => {
  setOpponent(match.opponent);
  setSide(match.side);
  document.querySelector(`#help-${match.side}`).classList.remove("hidden");
  const statusSpan = document.querySelector("#status");
  let turn =
    match.side === "guesser" ? match.guesses.length : match.answers.length;
  if (match.myTurn) {
    board.unlock();
    setStatus("👍", "Ready when you are!");
  } else {
    turn--;
    board.lock();
    if (match.isLive) {
      setStatus("⌛", "Waiting for opponent...");
    } else {
      if (match.winner) {
        if (match.winner === match.side) {
          setStatus("🥇", "You won!");
        } else {
          setStatus("🥈", "You lost.");
        }
      } else {
        setStatus("🐛", "Match over.");
      }
    }
  }
  let words = match.guesses;
  if (match.answers && match.answers.length > match.guesses.length) {
    words.push(match.answers[match.answers.length - 1]);
  }
  board.updateContent(words, match.results, turn);
});

if (token) {
  socket.auth = { token };
  socket.connect();
} else {
  location.replace("/");
}

socket.onAny((err, ...args) => {
  console.log(err, args);
});

socket.emit("match-fetch", { matchId });
