const express = require("express");
const socketIo = require("socket.io");
require("dotenv").config({ path: __dirname + "/.env" });
const PORT = process.env.PORT || 8080;
const words = require("./words");

const server = express()
  .use((req, res) => res.send({ response: "I am alive" }).status(200))
  .listen(PORT, () => console.log(`listening on ${PORT}`));

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let rooms = [];
let players = [];
let turns = [];

const getRoom = (rooms, roomCode) => {
  return rooms.filter((room) => room.roomCode === roomCode)[0];
};

io.on("connection", (socket) => {
  socket.on("draw", (drawingData, roomCode) => {
    turns[turns.length - 1].drawing = drawingData;
    io.to(roomCode).emit("draw", drawingData, turns);
  });

  socket.on("createLobby", (playerObj, roomCode) => {
    players.push(playerObj);
    socket.join(roomCode);
    io.to(roomCode).emit("createLobby", players);
  });

  socket.on("joinLobby", (playerObj, roomCode) => {
    players.push(playerObj);
    socket.join(roomCode);
    io.to(roomCode).emit("joinLobby", players, roomCode);
  });

  socket.on("selectWord", (word, roomCode) => {
    let time = 90;
    turns[turns.length - 1].word = word;
    setInterval(() => {
      if (time > -1) {
        io.to(roomCode).emit("setTimer", time);
      }
      time--;
    }, 1000);
    io.to(roomCode).emit("selectWord", turns);
  });

  socket.on("startGame", (roomCode) => {
    const firstTurnPlayer = players[Math.floor(Math.random() * players.length)];
    const turnObj = {
      word: "banana",
      drawing: "",
      artist: firstTurnPlayer,
      guesses: [],
      active: true,
      possibleWords: [],
    };

    let possibleWords = [];
    for (i = 0; i < 3; i++) {
      const index = Math.floor(Math.random() * words.length);
      possibleWords.push(words[index]);
      turnObj.possibleWords.push(words[index]);
      words.splice(index, 1);
    }

    turns.push(turnObj);
    io.to(roomCode).emit("startGame", turns);
  });

  socket.on("guess", (guess, roomCode) => {
    turns[turns.length - 1].guesses.push(guess);
    io.to(roomCode).emit("guess", guess, turns);
  });

  socket.on("endGame", (roomCode) => {
    console.log(roomCode);
    turns = [];
    players = [];
    io.to(roomCode).emit("endGame");
  });
});
