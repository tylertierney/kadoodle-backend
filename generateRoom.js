const fullWordList = require("./words");

const generateRoom = (roomCode) => {
  return {
    roomCode: roomCode,
    players: [],
    turns: [],
    possibleArtists: [],
    wordList: [...fullWordList],

    addPlayer(playerObj) {
      this.players.push(playerObj);
      this.possibleArtists.push(playerObj);
    },

    addTurn(turnObj) {
      this.turns.push(turnObj);
    },

    getCurrentTurn() {
      const lastIndex = this.turns.length - 1;
      return this.turns[lastIndex];
    },

    getRandomArtist() {
      const randomIndex = Math.floor(
        Math.random() * this.possibleArtists.length
      );
      return this.possibleArtists.splice(randomIndex, 1)[0];
    },

    addPointsToPlayer(playerId, pointsToAdd) {
      for (let player of this.players) {
        if (player.id === playerId) {
          player.points += pointsToAdd;
        }
      }
    },
  };
};

module.exports = generateRoom;
