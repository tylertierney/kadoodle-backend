const express = require("express");
const socketIo = require("socket.io");
require("dotenv").config({ path: __dirname + "/.env" });
const PORT = process.env.PORT || 8080;
// const axios = require("axios");
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

// const getIpAddress = async () => {
//   const res = await axios.get(
//     `https://geolocation-db.com/json/${process.env.GEOLOCATION_API_KEY}`
//   );
//   return res.data.IPv4;
// };

let players = [];
let turns = [];

// io.on("connection", (socket) => {
//   getIpAddress().then((res) => {
//     socket.join(res);
//     io.to(res).emit("ipAddress", res);

//     socket.on("draw", (drawingData) => {
//       turns[turns.length - 1].drawing = drawingData;
//       io.to(res).emit("draw", drawingData, turns);
//     });

//     socket.on("createLobby", (playerObj) => {
//       players.push(playerObj);
//       io.to(res).emit("createLobby", players);
//     });

//     socket.on("joinLobby", (playerObj) => {
//       players.push(playerObj);
//       io.to(res).emit("createLobby", players);
//     });

//     socket.on("selectWord", (word) => {
//       let time = 90;
//       turns[turns.length - 1].word = word;
//       setInterval(() => {
//         if (time > -1) {
//           io.to(res).emit("setTimer", time);
//         }
//         time--;
//       }, 1000);
//       io.to(res).emit("selectWord", turns);
//     });

//     socket.on("startGame", () => {
//       const firstTurnPlayer =
//         players[Math.floor(Math.random() * players.length)];
//       const turnObj = {
//         word: "banana",
//         drawing: "",
//         artist: firstTurnPlayer,
//         guesses: [],
//         active: true,
//         possibleWords: [],
//       };

//       let possibleWords = [];
//       for (i = 0; i < 3; i++) {
//         const index = Math.floor(Math.random() * words.length);
//         possibleWords.push(words[index]);
//         turnObj.possibleWords.push(words[index]);
//         words.splice(index, 1);
//       }

//       turns.push(turnObj);
//       io.to(res).emit("startGame", turns);
//     });

//     socket.on("guess", (guess) => {
//       turns[turns.length - 1].guesses.push(guess);
//       io.to(res).emit("guess", guess, turns);
//     });

//     socket.on("endGame", () => {
//       turns = [];
//       players = [];
//       io.to(res).emit("endGame");
//     });
//   });
// });

io.on("connection", (socket) => {
  socket.on("draw", (drawingData, roomCode) => {
    turns[turns.length - 1].drawing = drawingData;
    io.to(roomCode).emit("draw", drawingData, turns);
  });

  socket.on("createLobby", (playerObj, roomCode) => {
    players.push(playerObj);
    io.to(roomCode).emit("createLobby", players);
  });

  socket.on("joinLobby", (playerObj, roomCode) => {
    players.push(playerObj);
    socket.join(roomCode);
    io.to(roomCode).emit("createLobby", players);
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

  socket.on("endGame", () => {
    turns = [];
    players = [];
    io.to(roomCode).emit("endGame");
  });
});
