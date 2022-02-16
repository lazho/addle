const { Server } = require("socket.io");
const path = require("path");
const authComponent = require("./auth");
const matchComponent = require("./match");
const { dbSetup } = require("./db");
const { formatName } = require("./utils");
const queueComponent = require("./queue");

const fastify = require("fastify")({
  logger: false,
});

// Setup our static files
fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "public"),
  prefix: "/",
});

fastify.register(require("fastify-socket.io"), {
  cors: {
    origin: ["https://addle.glitch.me", "https://addle.pekoe.dev"],
  },
});

// point-of-view is a templating manager for fastify
fastify.register(require("point-of-view"), {
  engine: {
    handlebars: require("handlebars"),
  },
});

// Load and parse SEO data
const seo = require("./src/seo.json");
if (seo.url === "glitch-default") {
  seo.url = `https://${process.env.PROJECT_DOMAIN}.glitch.me`;
}

fastify.get("/", function (req, res) {
  res.view("/src/pages/index.hbs", {
    seo,
  });
});

fastify.get("/match/:matchId", function (req, res) {
  res.view("/src/pages/match.hbs", {
    seo,
    matchId: req.params.matchId,
  });
});

// Run the server and report out to the logs
fastify.listen(process.env.PORT, "0.0.0.0", async function (err, address) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  await dbSetup();
  console.log(`Your app is listening on ${address}`);
  fastify.log.info(`server listening on ${address}`);
});

const nameCache = {};
const getName = async function (userId) {
  if (nameCache[userId]) {
    return nameCache[userId];
  }
  const user = await authComponent.getUser(userId);
  const name = {
    handle: user.handle,
    discriminator: user.discriminator,
  };
  nameCache[userId] = name;
  return name;
};

fastify.ready().then(async () => {
  fastify.io.on("connection", async (socket) => {
    // 1. authenticate
    const token = socket.handshake.auth.token;
    let user;
    if (token) {
      user = await authComponent.authenticate(token);
      if (!user) {
        user = await authComponent.newUser();
        socket.emit("new-token", { token: user.token });
      }
    } else {
      user = await authComponent.newUser();
      socket.emit("new-token", { token: user.token });
    }

    socket.join(user.snowflake);
    nameCache[user.snowflake] = {
      handle: user.handle,
      discriminator: user.discriminator,
    };
    socket.emit("session", {
      handle: user.handle,
      discriminator: user.discriminator,
    });

    // 2. register listeners
    socket.on("queue-state", () => {
      let queueState = queueComponent.getState(user.snowflake);
      if (queueState) {
        socket.emit("queue-entered", queueState);
      } else {
        socket.emit("not-queued");
      }
    });

    socket.on("match-list", async () => {
      let matches = await matchComponent.listMatches(user.snowflake, true);
      let summaries = await Promise.all(
        matches.map(async (match) => {
          let opponentName = formatName(await getName(match.opponentId));
          return {
            snowflake: match.snowflake,
            side: match.side,
            opponentName,
            createdAt: match.createdAt,
          };
        })
      );
      socket.emit("match-list", { matches: summaries });
    });

    socket.on("change-handle", async () => {
      user = await authComponent.changeHandle(user.snowflake);
      socket.emit("change-username", {
        handle: user.handle,
        discriminator: user.discriminator,
      });
      nameCache[user.snowflake] = {
        handle: user.handle,
        discriminator: user.discriminator,
      };
    });

    socket.on("enter-queue", async ({ side }) => {
      queueComponent.enterQueue(user.snowflake, side);
      fastify.io.to(user.snowflake).emit("queue-entered", { side });
      const pair = queueComponent.matchMake();
      if (pair) {
        console.log(
          `[matchMake] Match found! G: ${formatName(
            await getName(pair.guesser)
          )} vs E: ${formatName(await getName(pair.enemy))}.`
        );
        const match = await matchComponent.newMatch(pair.guesser, pair.enemy);
        fastify.io.to(pair.guesser).emit("match-found");
        fastify.io.to(pair.enemy).emit("match-found");
        fastify.io.to(pair.guesser).emit("not-queued");
        fastify.io.to(pair.enemy).emit("not-queued");
      }
    });

    socket.on("leave-queue", () => {
      queueComponent.leaveQueue(user.snowflake);
      fastify.io.to(user.snowflake).emit("not-queued");
    });

    socket.on("match-fetch", async ({ matchId }) => {
      const match = await matchComponent.viewMatch(matchId, user.snowflake);
      if (!match) {
        socket.emit("match-not-found");
        return;
      }
      match.opponent = formatName(await getName(match.opponent));
      socket.emit("match-fetch", { match });
    });

    socket.on("move", async ({ word, matchId }) => {
      const result = await matchComponent.move(matchId, word, user.snowflake);
      if (result.validation.valid) {
        socket.emit("move-accepted", { word: word.toUpperCase() });
        fastify.io.to(result.opponentId).emit("opponent-move", { matchId });
      } else {
        socket.emit("move-rejected", { reason: result.validation.reason });
      }
      if (result.winner) {
        fastify.io.to(user.snowflake).emit("match-ended");
        fastify.io.to(result.opponentId).emit("match-ended");
      }
    });

    socket.onAny((event, ...args) => {
      console.log(
        `[${event}] from ${formatName(user)} (${user.snowflake}):`,
        ...args
      );
    });
  });
});
