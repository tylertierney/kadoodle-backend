const express = require("express");
const socketIo = require("socket.io");
require("dotenv").config({ path: __dirname + "/.env" });
const PORT = process.env.PORT || 8080;
const axios = require("axios");

const server = express()
  .use((req, res) => res.send({ response: "I am alive" }).status(200))
  .listen(PORT, () => console.log(`listening on ${PORT}`));

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const getIpAddress = async () => {
  const res = await axios.get(
    `https://geolocation-db.com/json/${process.env.GEOLOCATION_API_KEY}`
  );
  return res.data.IPv4;
};

let players = [];
let turns = [];

io.on("connection", (socket) => {
  getIpAddress().then((res) => {
    socket.join(res);
    io.to(res).emit("ipAddress", res);

    socket.on("draw", (drawingData) => {
      turns[turns.length - 1].drawing = drawingData;
      io.to(res).emit("draw", drawingData, turns);
    });

    socket.on("createLobby", (playerObj) => {
      players.push(playerObj);
      io.to(res).emit("createLobby", players);
    });

    socket.on("joinLobby", (playerObj) => {
      players.push(playerObj);
      io.to(res).emit("createLobby", players);
    });

    socket.on("startGame", () => {
      const firstTurnPlayer =
        players[Math.floor(Math.random() * players.length)];
      const turnObj = {
        word: "banana",
        drawing: "",
        artist: firstTurnPlayer,
        guesses: [],
        active: true,
      };
      turns.push(turnObj);
      io.to(res).emit("startGame", turns);
    });

    socket.on("guess", (guess) => {
      turns[turns.length - 1].guesses.push(guess);
      io.to(res).emit("guess", guess, turns);
    });

    socket.on("endGame", () => {
      turns = [];
      players = [];
      io.to(res).emit("endGame");
    });
  });
});
