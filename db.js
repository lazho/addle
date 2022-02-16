const { Sequelize, DataTypes, Op } = require("sequelize");

const sequelize = new Sequelize(
  "database",
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: "0.0.0.0",
    dialect: "sqlite",
    dialectOptions: {
      supportBigNumbers: true,
      bigNumberStrings: true,
    },
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    storage: ".data/database.sqlite",
  }
);

const Auth = sequelize.define("Auth", {
  snowflake: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  token: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  handle: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: "handleDiscriminator",
  },
  discriminator: {
    type: DataTypes.INTEGER(8),
    allowNull: false,
    unique: "handleDiscriminator",
  },
  lastSeenAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
});

const Match = sequelize.define("Match", {
  snowflake: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  guesserId: {
    type: DataTypes.STRING,
    references: {
      model: Auth,
      key: "snowflake",
    },
    allowNull: false,
  },
  enemyId: {
    type: DataTypes.STRING,
    references: {
      model: Auth,
      key: "snowflake",
    },
    allowNull: false,
  },
  isLive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  winnerId: {
    type: DataTypes.STRING,
  },
  board: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: false,
  },
});

const dbSetup = async function () {
  try {
    await sequelize.authenticate();
  } catch (e) {
    console.error("Cannot connect to db.", e);
  }
  await dbClean();
};

const dbClean = async function() {
  const ttlMs = 1000 * 60 * 60 * 24;
  await Match.destroy({
    where: {
      isLive: true,
      createdAt: {
        [Op.lt]: new Date(Date.now() - ttlMs),
      }
    }
  })
}

module.exports = {
  sequelize,
  dbSetup,
  Auth,
  Match,
};
