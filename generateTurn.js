const generateTurn = (artist, wordList) => {
  let possibleWords = [];
  for (i = 0; i < 3; i++) {
    const index = Math.floor(Math.random() * wordList.length);
    possibleWords.push(wordList[index]);
    wordList.splice(index, 1);
  }

  return {
    word: "",
    drawing: "",
    artist: artist,
    guesses: [],
    active: true,
    possibleWords,

    setWord(newWord) {
      this.word = newWord;
    },

    addGuess(guess) {
      this.guesses.push(guess);
    },

    numOfCorrectGuesses() {
      return this.guesses.reduce((acc, curr) => {
        if (curr.isCorrect) {
          return acc + 1;
        }
        return acc;
      }, 0);
    },

    checkIfPlayerHasAlreadyScored(playerId) {
      for (let guess of this.guesses) {
        if (guess.isCorrect && guess.id === playerId) {
          return true;
        }
      }
      return false;
    },

    draw(drawingData) {
      this.drawing = drawingData;
    },
  };
};

module.exports = generateTurn;
