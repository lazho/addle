const guesserQueue = [];
const enemyQueue = [];
const queue = [];

const getState = function (snowflake) {
  if (guesserQueue.includes(snowflake)) {
    return { side: "guesser" };
  }
  if (enemyQueue.includes(snowflake)) {
    return { side: "enemy" };
  }
  return false;
};

const enterQueue = function (snowflake, side) {
  if (guesserQueue.includes(snowflake) || enemyQueue.includes(snowflake)) {
    console.log(`[enter-queue] ${snowflake} is already queueing!`);
    return;
  }
  switch (side) {
    case "guesser":
      guesserQueue.push(snowflake);
      break;
    case "enemy":
      enemyQueue.push(snowflake);
      break;
  }
};

const leaveQueue = function (snowflake) {
  let i = guesserQueue.findIndex((ticket) => ticket === snowflake);
  if (i > -1) {
    guesserQueue.splice(i, 1);
  }
  i = enemyQueue.findIndex((ticket) => ticket === snowflake);
  if (i > -1) {
    enemyQueue.splice(i, 1);
  }
};

const matchMake = function () {
  console.log("[matchMake] Serving the queue!");
  if (guesserQueue.length > 0 && enemyQueue.length > 0) {
    const guesser = guesserQueue.shift();
    const enemy = enemyQueue.shift();
    console.log(`[matchMake] Match found! G: ${guesser} vs E: ${enemy}`);
    return { guesser, enemy };
  }
};

module.exports = {
  getState,
  enterQueue,
  leaveQueue,
  matchMake,
};
