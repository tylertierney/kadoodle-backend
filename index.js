const express = require("express");
const socketIo = require("socket.io");
require("dotenv").config({ path: __dirname + "/.env" });
const PORT = process.env.PORT || 8080;
const generateRoom = require("./generateRoom");
const generateTurn = require("./generateTurn");

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

const getRoom = (roomCode) => {
  return rooms.find((room) => room.roomCode === roomCode);
};

io.on("connection", (socket) => {
  socket.on("draw", (drawingData, roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    room.getCurrentTurn().draw(drawingData);
    io.to(roomCode).emit("draw", drawingData, room.turns);
  });

  socket.on("createLobby", (playerObj, roomCode) => {
    const newRoom = generateRoom(roomCode);
    newRoom.addPlayer(playerObj);
    rooms.push(newRoom);
    socket.join(roomCode);
    io.to(roomCode).emit("createLobby", newRoom.players);
  });

  socket.on("checkIfRoomExists", (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) {
      socket.emit("checkIfRoomExists", false);
      return;
    }
    socket.emit("checkIfRoomExists", true);
  });

  socket.on("joinLobby", (playerObj, roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    room.addPlayer(playerObj);
    socket.join(roomCode);
    io.to(roomCode).emit("joinLobby", room.players, roomCode);
  });

  socket.on("selectWord", (word, roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    let currentTurn = room.getCurrentTurn();
    let time = 90;

    if (room.players.length === 1) {
      currentTurn.lastTurn = true;
    }

    const handleTimer = setInterval(() => {
      time--;
      if (time === 0) {
        currentTurn.active = false;
        io.to(roomCode).emit("endTurn", room.turns);
        io.to(roomCode).emit("setTimer", 90);
        clearInterval(handleTimer);
        return;
      }
      if (!currentTurn.active) {
        io.to(roomCode).emit("setTimer", 90);
        clearInterval(handleTimer);
        return;
      }
      if (time > -1) {
        currentTurn.timeRemaining = time;
        io.to(roomCode).emit("setTimer", time);
      }
    }, 1000);

    currentTurn.setWord(word);
    io.to(roomCode).emit("selectWord", room.turns);
  });

  socket.on("startGame", (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const firstTurnArtist = room.getRandomArtist();
    const turnObj = generateTurn(firstTurnArtist, room.wordList);
    room.addTurn(turnObj);
    io.to(roomCode).emit("startGame", room.turns, room.players);
  });

  socket.on("startTurn", (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const artist = room.getRandomArtist();
    const turnObj = generateTurn(artist, room.wordList);
    if (room.turns.length >= room.players.length - 1) {
      turnObj.lastTurn = true;
    }
    room.addTurn(turnObj);
    io.to(roomCode).emit("startTurn", room.turns);
  });

  socket.on("guess", (guess, roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const currentTurn = room.getCurrentTurn();
    const addPoints = !currentTurn.checkIfPlayerHasAlreadyScored(guess.id);
    currentTurn.addGuess(guess);

    if (guess.isCorrect) {
      const pointsToAdd =
        Math.floor(75 / currentTurn.numOfCorrectGuesses()) +
        currentTurn.timeRemaining;
      if (addPoints) {
        room.addPointsToPlayer(guess.id, pointsToAdd);
        currentTurn.addPointsThisTurn(guess, pointsToAdd);
        if (currentTurn.checkWhetherToEndRound(room.players.length)) {
          io.to(roomCode).emit("endTurn", room.turns);
          currentTurn.active = false;
        }
        io.to(roomCode).emit("addedPoints", room.players);
      }
    }
    io.to(roomCode).emit("guess", guess, room.turns);
  });

  socket.on("getCurrentGame", (roomCode) => {
    const room = getRoom(roomCode);
    socket.join(roomCode);
    io.to(roomCode).emit("getCurrentGame", room);
  });

  socket.on("endGame", (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) {
      io.to(roomCode).emit("endGame");
      socket.emit("endGame");
      return;
    }

    const currentTurn = room.getCurrentTurn();
    if (currentTurn) {
      currentTurn.active = true;
    }
    room.turns = [];
    room.players = [];
    io.to(roomCode).emit("endGame");
  });

  socket.on("restartGame", (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return;
    room.restartGame();
    const firstTurnArtist = room.getRandomArtist();
    const turnObj = generateTurn(firstTurnArtist, room.wordList);
    room.addTurn(turnObj);
    io.to(roomCode).emit("startGame", room.turns, room.players);
  });
});
