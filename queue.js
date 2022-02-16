const guesserQueue = [];
const enemyQueue = [];
const flexQueue = [];

const getState = function (snowflake) {
  if (guesserQueue.includes(snowflake)) {
    return { side: "guesser" };
  }
  if (enemyQueue.includes(snowflake)) {
    return { side: "enemy" };
  }
  if (flexQueue.includes(snowflake)) {
    return { side: "flex" };
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
    default:
      flexQueue.push(snowflake);
  }
  console.log(`[enter-queue] ${snowflake} entered the ${side} queue.`);
};

const leaveQueue = function (snowflake) {
  let i = guesserQueue.findIndex((ticket) => ticket === snowflake);
  if (i > -1) {
    guesserQueue.splice(i, 1);
    console.log(`[leaveQueue] ${snowflake} left the guesser queue.`);
  }
  i = enemyQueue.findIndex((ticket) => ticket === snowflake);
  if (i > -1) {
    enemyQueue.splice(i, 1);
    console.log(`[leaveQueue] ${snowflake} left the enemy queue.`);
  }
  i = flexQueue.findIndex((ticket) => ticket === snowflake);
  if (i > -1) {
    flexQueue.splice(i, 1);
    console.log(`[leaveQueue] ${snowflake} left the flex queue.`);
  }
};

const matchMake = function () {
  console.log("[matchMake] Serving the queue!");
  if (flexQueue.length >= 2) {
    return { guesser: flexQueue.shift(), enemy: flexQueue.shift() };
  }

  if (flexQueue.length == 1) {
    if (enemyQueue.length) {
      return { guesser: flexQueue.shift(), enemy: enemyQueue.shift() };
    }
    if (guesserQueue.length) {
      return { guesser: guesserQueue.shift(), enemy: flexQueue.shift() };
    }
  }
  
  if (guesserQueue.length && enemyQueue.length) {
    return { guesser: guesserQueue.shift(), enemy: enemyQueue.shift() };
  }
};

module.exports = {
  getState,
  enterQueue,
  leaveQueue,
  matchMake,
};
