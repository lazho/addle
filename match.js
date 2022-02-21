const { UniqueConstraintError, Op } = require("sequelize");
const { sequelize, Match } = require("./db");
const { generateSnowflake } = require("./utils");
const gameComponent = require("./game");

const newMatch = async function (
  guesserId,
  enemyId,
  isLive = true,
  board = new gameComponent.Board(),
  metadata = {},
  tries = process.MAX_UNIQUE_ATTEMPTS
) {
  try {
    const match = {
      snowflake: generateSnowflake(),
      guesserId,
      enemyId,
      isLive,
      board,
      metadata,
    };
    const model = await Match.create(match);
    return match;
  } catch (e) {
    if (e instanceof UniqueConstraintError) {
      if (tries) {
        return await newMatch(guesserId, enemyId, metadata, tries - 1);
      }
    }
    throw e;
  }
};

const getMatch = async function (snowflake) {
  const model = Match.findOne({
    where: { snowflake },
  });
  return {
    snowflake: model.snowflake,
    guesserId: model.guesserId,
    enemyId: model.enemyId,
    isLive: model.isLive,
    winnerId: model.winnerId,
    createdAt: model.createdAt,
    board: model.board,
    metadata: model.metadata,
  };
};

const listMatches = async function (userId) {
  const models = await Match.findAll({
    where: {
      isLive: true,
      [Op.or]: [{ guesserId: userId }, { enemyId: userId }],
    },
  });

  return models.map((model) => {
    const { snowflake, guesserId, enemyId, isLive, winnerId, createdAt } =
      model;
    return {
      snowflake,
      side: guesserId === userId ? "guesser" : "enemy",
      opponentId: guesserId === userId ? enemyId : guesserId,
      createdAt,
    };
  });
};

const viewMatch = async function (snowflake, userId) {
  const model = await Match.findOne({
    where: { snowflake },
  });
  if (model === null) {
    return;
  }
  let side;
  if (userId === model.guesserId) {
    side = "guesser";
  } else if (userId === model.enemyId) {
    side = "enemy";
  } else {
    return;
  }

  const board = model.board;
  const results = [];
  for (let i = 0; i < board.guesses.length && i < board.answers.length; i++) {
    results.push(gameComponent.compare(board.guesses[i], board.answers[i]));
  }
  const myTurn =
    ["both", side].includes(gameComponent.checkTurn(board)) && model.isLive;
  let guesses = board.guesses;
  if (side === "enemy") {
    guesses = guesses.slice(0, board.answers.length);
  }
  const winner = gameComponent.checkWin(board);

  return {
    snowflake,
    createdAt: model.createdAt,
    isLive: model.isLive,
    opponent: side === "guesser" ? model.enemyId : model.guesserId,
    winner,
    side,
    myTurn,
    guesses,
    results,
    answers: side === "enemy" ? board.answers : undefined,
  };
};

const move = async function (snowflake, word, userId) {
  const model = await Match.findOne({
    where: { snowflake, isLive: true },
  });

  const { guesserId, enemyId, board } = model;
  const side =
    guesserId === userId ? "guesser" : enemyId === userId ? "enemy" : undefined;
  if (!side) {
    return {
      validation: {
        valid: false,
        reason: "You aren't in this match!",
      },
    };
  }
  const turn = gameComponent.checkTurn(board);
  if (turn === "both" || turn === side) {
    const validation = gameComponent.validateMove(board, word, side);
    if (validation.valid) {
      switch (side) {
        case "guesser":
          board.guesses.push(word);
          break;
        case "enemy":
          board.answers.push(word);
          break;
      }
    } else {
      return {
        validation,
      };
    }
    model.changed("board", true);
    await model.save();
    const winner = gameComponent.checkWin(board);
    if (winner) {
      model.isLive = false;
      switch (winner) {
        case "guesser":
          model.winnerId = model.guesserId;
          break;
        case "enemy":
          model.enemyId = model.enemyId;
          break;
      }
      await model.save();
    }

    return {
      validation,
      opponentId: side === "guesser" ? model.enemyId : model.guesserId,
      winner,
    };
  }

  return {
    validation: {
      valid: false,
      reason: "It's not your turn!",
    },
  };
};

module.exports = {
  newMatch,
  getMatch,
  listMatches,
  viewMatch,
  move,
};
