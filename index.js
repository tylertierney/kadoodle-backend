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

const getRoomIndex = (roomCode) => {
  return rooms.findIndex((room) => room.roomCode === roomCode);
};

io.on("connection", (socket) => {
  socket.on("draw", (drawingData, roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    if (roomIndex < 0) {
      return;
    }
    const turnsIndex = rooms[roomIndex].turns.length - 1;
    rooms[roomIndex].turns[turnsIndex].drawing = drawingData;
    io.to(roomCode).emit("draw", drawingData, rooms[roomIndex].turns);
  });

  socket.on("createLobby", (playerObj, roomCode) => {
    const roomObj = { roomCode: roomCode, players: [playerObj], turns: [] };
    rooms.push(roomObj);
    socket.join(roomCode);
    io.to(roomCode).emit("createLobby", roomObj.players);
  });

  socket.on("checkIfRoomExists", (roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    if (roomIndex < 0) {
      socket.emit("checkIfRoomExists", false);
      return;
    }
    socket.emit("checkIfRoomExists", true);
  });

  socket.on("joinLobby", (playerObj, roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    rooms[roomIndex].players.push(playerObj);
    socket.join(roomCode);
    io.to(roomCode).emit("joinLobby", rooms[roomIndex].players, roomCode);
  });

  socket.on("selectWord", (word, roomCode) => {
    let time = 90;
    setInterval(() => {
      if (time > -1) {
        io.to(roomCode).emit("setTimer", time);
      }
      time--;
    }, 1000);
    const roomIndex = getRoomIndex(roomCode);
    const turns = [...rooms[roomIndex].turns];
    turns[turns.length - 1].word = word;
    rooms[roomIndex].turns = turns;
    io.to(roomCode).emit("selectWord", turns);
  });

  socket.on("startGame", (roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    const firstTurnPlayer =
      rooms[roomIndex].players[
        Math.floor(Math.random() * rooms[roomIndex].players.length)
      ];
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

    rooms[roomIndex].turns.push(turnObj);
    io.to(roomCode).emit("startGame", [turnObj]);
  });

  socket.on("guess", (guess, roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    if (roomIndex < 0) {
      return;
    }
    const turns = [...rooms[roomIndex].turns];

    let addPoints = true;
    rooms[roomIndex].turns[turns.length - 1].guesses.forEach((curr) => {
      if (curr.isCorrect && curr.id === guess.id) {
        addPoints = false;
      }
    });
    rooms[roomIndex].turns[turns.length - 1].guesses.push(guess);
    const guesses = rooms[roomIndex].turns[turns.length - 1].guesses;

    if (guess.isCorrect) {
      const numOfCorrectGuesses = guesses.reduce((acc, curr) => {
        if (curr.isCorrect) {
          return acc + 1;
        }
        return acc;
      }, 0);
      const pointsToAdd = Math.floor(100 / numOfCorrectGuesses);
      if (addPoints) {
        for (let player of rooms[roomIndex].players) {
          if (player.id === guess.id) {
            player.points += pointsToAdd;
          }
        }
        io.to(roomCode).emit("addedPoints", rooms[roomIndex].players);
      }
    }
    io.to(roomCode).emit("guess", guess, turns);
  });

  socket.on("getCurrentGame", (roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    socket.join(roomCode);
    io.to(roomCode).emit("getCurrentGame", rooms[roomIndex]);
  });

  socket.on("endGame", (roomCode) => {
    const roomIndex = getRoomIndex(roomCode);
    if (roomIndex < 0) {
      io.to(roomCode).emit("endGame");
      return;
    }
    rooms[roomIndex].turns = [];
    rooms[roomIndex].players = [];
    io.to(roomCode).emit("endGame");
  });
});
