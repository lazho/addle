const { words } = require("./words.json");

class Board {
  constructor() {
    this.guesses = [];
    this.answers = [];
  }
}

const validateWord = function (word) {
  return words.includes(word);
}

const compare = function (guess, answer) {
  validateWord(guess);
  validateWord(answer);
  let result = Array(5).fill("miss");
  let letterCounts = {};
  // count the occurences of letters in the answer for the close calls
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i] = "hit";
      continue;
    }
    if (letterCounts[answer[i]]) {
      letterCounts[answer[i]]++;
    } else {
      letterCounts[answer[i]] = 1;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (result[i] === "hit") {
      continue;
    }
    if (letterCounts[guess[i]]) {
      letterCounts[guess[i]]--;
      result[i] = "close";
    }
  }

  return result;
};

const checkTurn = function (board) {
  const guesses = board.guesses.length;
  const answers = board.answers.length;
  if (guesses === answers) {
    return "both";
  }
  if (guesses < answers) {
    return "guesser";
  }
  return "enemy";
};

const checkWin = function (board) {
  const turn = board.guesses.length;
  if (turn != board.answers.length) {
    return undefined;
  }

  if (turn === 0) {
    return undefined;
  }

  if (board.guesses[turn - 1] === board.answers[turn - 1]) {
    return "guesser";
  }

  if (turn === 6) {
    return "enemy";
  }

  return undefined;
};

const constrain = function (guess, answer) {
  let constraints = {
    hits: Array(5).fill(""),
    misses: Array(5).fill(""),
    bans: [],
    exactly: {},
    atLeast: {},
  };

  let guessCounts = {};
  let answerCounts = {};
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      constraints.hits[i] = guess[i];
      continue;
    }
    constraints.misses[i] = guess[i];
    if (guessCounts[guess[i]]) {
      guessCounts[guess[i]]++;
    } else {
      guessCounts[guess[i]] = 1;
    }
    if (answerCounts[answer[i]]) {
      answerCounts[answer[i]]++;
    } else {
      answerCounts[answer[i]] = 1;
    }
  }

  for (let letter in guessCounts) {
    if (answerCounts[letter]) {
      if (guessCounts[letter] > answerCounts[letter]) {
        constraints.exactly[letter] = answerCounts[letter];
      } else {
        constraints.atLeast[letter] = guessCounts[letter];
      }
    } else {
      constraints.bans.push(letter);
    }
  }
  return constraints;
};

const validateConstraints = function (answer, constraints) {
  let counts = {};
  for (let i = 0; i < 5; i++) {
    if (constraints.hits[i]) {
      if (constraints.hits[i] !== answer[i]) {
        return {
          valid: false,
          reason: `"${constraints.hits[i].toUpperCase()}" must be letter ${i + 1}.`,
        };
      }
      continue;
    }
    if (constraints.misses[i] === answer[i]) {
      return {
        valid: false,
          reason: `"${answer[i].toUpperCase()}" cannot be letter ${i + 1}.`
      }
    }
    if (constraints.bans.includes(answer[i])) {
      return {
        valid: false,
        reason: `"${answer[i].toUpperCase()}" cannot be in the word.`,
      };
    }
    if (counts[answer[i]]) {
      counts[answer[i]]++;
    } else {
      counts[answer[i]] = 1;
    }
  }
  for (let letter in constraints.exactly) {
    if (!counts[letter] || counts[letter] != constraints.exactly[letter]) {
      return {
        valid: false,
        reason: `"${letter.toUpperCase()}" must appear exactly ${constraints.exactly[letter]} time(s) in the word.`,
      };
    }
  }
  for (let letter in constraints.atLeast) {
    if (!counts[letter] || counts[letter] < constraints.atLeast[letter]) {
      return {
        valid: false,
        reason: `"${letter.toUpperCase()}" must appear at least ${constraints.atLeast[letter]} time(s) in the word.`,
      };
    }
  }
  return {
    valid: true,
  };
};

const validateMove = function (board, word, side) {
  if (!validateWord(word)) {
    return {
      valid: false,
      reason: `"${word.toUpperCase()}" is not in the dictionary.`,
    };
  }

  if (side == "enemy") {
    for (let i = 0; i < board.answers.length; i++) {
      let validation = validateConstraints(
        word,
        constrain(board.guesses[i], board.answers[i])
      );
      if (!validation.valid) {
        return {
          valid: false,
          reason: `"${word.toUpperCase()}" does not satisfy the constraints from round #${
            i + 1
          }. ${validation.reason}`,
        };
      }
    }

    return {
      valid: true,
    };
  }
};

module.exports = {
  Board,

  checkWin,
  checkTurn,
  validateMove,
  compare,
};
