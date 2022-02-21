const winston = require("winston");

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [
    new winston.transports.Console({ level: "error" }),
    new winston.transports.File({
      filename: `.data/logs/app/${Date.now()}.log`,
      level: "info",
    }),
    new winston.transports.File({
      filename: `.data/logs/debug/${Date.now()}.log`,
      level: "debug",
    }),
  ],
});

module.exports = { logger };
