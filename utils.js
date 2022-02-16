const crypto = require("crypto");
const { green } = require("./words.json");

const generateSnowflake = function () {
  return (
    BigInt(Date.now()) * BigInt(Math.pow(2, 16)) +
    BigInt(crypto.randomInt(Math.pow(2, 16)))
  ).toString();
};

const generateToken = function () {
  return crypto.randomUUID();
};

const generateHandle = function () {
  return green[crypto.randomInt(green.length)];
};

const generateDiscriminator = function () {
  return crypto.randomInt(1, Math.pow(10, process.env.DISCRIMINATOR_LENGTH));
};

const formatName = function (arg1, arg2 = undefined) {
  if (arg2) {
    return `${arg1}#${arg2}`;
  }
  return `${arg1.handle}#${arg1.discriminator}`;
}

module.exports = {
  generateSnowflake,
  generateToken,
  generateHandle,
  generateDiscriminator,
  formatName,
};
