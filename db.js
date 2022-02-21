const { Sequelize, DataTypes, Op } = require("sequelize");
const cron = require("node-cron");
const { logger } = require("./log");

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
    logging: (msg) => logger.debug(msg),
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
    logger.error("Cannot connect to db.", e);
  }
  await dbClean();
  cron.schedule("0 * * * *", async () => {
    await dbClean();
  });
};

const dbClean = async function () {
  const dateThreshold = new Date(
    Date.now() - process.env.DB_CLEAN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await Match.destroy({
    where: {
      isLive: true,
      createdAt: {
        [Op.lt]: dateThreshold,
      },
    },
  });
  await sequelize.query(
    `
Delete FROM 
  Auths 
WHERE 
  Auths.snowflake IN (
    Select 
      Auths.snowflake 
    FROM 
      Auths 
      LEFT JOIN Matches ON Auths.snowflake = Matches.guesserId 
      OR Auths.snowflake = Matches.enemyId 
    WHERE 
      Matches.snowflake IS NULL 
      AND Auths.lastSeenAt < :dateThreshold
  );
`,
    {
      replacements: {
        dateThreshold,
      },
    }
  );
};

module.exports = {
  sequelize,
  dbSetup,
  Auth,
  Match,
};
