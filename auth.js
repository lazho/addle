const { UniqueConstraintError } = require("sequelize");
const { sequelize, Auth } = require("./db");
const {
  generateSnowflake,
  generateToken,
  generateHandle,
  generateDiscriminator,
  formatName,
} = require("./utils");
const { green } = require("./words.json");

const authenticate = async function (token) {
  const result = await Auth.findOne({
    where: {
      token,
    },
  });

  if (result) {
    result.lastSeenAt = Date.now();
    await result.save();
    const { snowflake, handle, discriminator, lastSeenAt } = result;
    console.log(
      `[authenticate] Authenticating ${handle}#${discriminator}, snowflake ID: ${snowflake}`
    );
    return { snowflake, handle, discriminator };
  }

  return undefined;
};

const newUser = async function (tries = process.env.MAX_UNIQUE_ATTEMPTS) {
  try {
    const newUser = {
      snowflake: generateSnowflake(),
      token: generateToken(),
      handle: generateHandle(),
      discriminator: generateDiscriminator(),
    };
    const newModel = await Auth.create(newUser);
    return newUser;
  } catch (e) {
    if (e instanceof UniqueConstraintError) {
      if (tries) {
        return await newUser(tries - 1);
      }
    }
    throw e;
  }
};

const getUser = async function (snowflake) {
  const model = await Auth.findOne({ where: { snowflake } });
  return {
    snowflake,
    handle: model.handle,
    discriminator: model.discriminator,
  };
};

const changeHandle = async function (
  snowflake,
  tries = process.env.MAX_UNIQUE_ATTEMPTS
) {
  try {
    const result = await Auth.findOne({
      where: {
        snowflake,
      },
    });
    if (result) {
      const { handle, discriminator } = result;
      result.handle = generateHandle();
      result.discriminator = generateDiscriminator();
      await result.save();
      console.log(
        `[changeHandle] Changed handle of ${formatName(
          handle,
          discriminator
        )} to ${formatName(result.handle, result.discriminator)}`
      );
      return {
        snowflake: result.snowflake,
        handle: result.handle,
        discriminator: result.discriminator,
      };
    }
  } catch (e) {
    if (e instanceof UniqueConstraintError) {
      if (tries) {
        return await changeHandle(snowflake, tries - 1);
      }
    }
    throw e;
  }
};

module.exports = { authenticate, newUser, getUser, changeHandle };
