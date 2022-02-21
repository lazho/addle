"use strict";

const token = localStorage.getItem("addle-token");

const socket = io("https://addle.glitch.me", {
  autoConnect: false,
});

const spanHandle = document.getElementById("handle");
const setHandle = function (handle) {
  spanHandle.innerText = handle;
};

const spanDiscriminator = document.getElementById("discriminator");
const setDiscriminator = function (discriminator) {
  spanDiscriminator.innerText = discriminator.toString().padStart(4, "0");
};

socket.on("session", ({ handle, discriminator }) => {
  setHandle(handle);
  setDiscriminator(discriminator);
});

socket.on("new-token", ({ token }) => {
  localStorage.setItem("addle-token", token);
});

if (token !== "undefined") {
  socket.auth = { token };
}

const aChangeHandle = document.getElementById("change-handle-tip");
aChangeHandle.addEventListener("click", () => {
  console.log("shuffling...");
  socket.emit("change-handle");
  console.log("shuffled");
});

socket.on("change-username", ({ handle, discriminator }) => {
  setHandle(handle);
  setDiscriminator(discriminator);
});

socket.onAny((err, ...args) => {
  console.log(err, args);
});

const queueSettings = {
  queue: "pvp",
  side: "flex",
};

let queueing = false;
const queueSettingsDisplay = function (group, choice) {
  const buttons = document.querySelectorAll(".choice-buttons .btn");
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].dataset.group !== group) {
      continue;
    }
    if (buttons[i].dataset.choice === choice) {
      buttons[i].classList.add("btn-active");
    } else {
      buttons[i].classList.remove("btn-active");
    }
  }
};

const choiceClickListener = function (event) {
  if (queueing) return;
  queueSettings[event.target.dataset.group] = event.target.dataset.choice;
  queueSettingsDisplay(event.target.dataset.group, event.target.dataset.choice);
};

const buttons = document.querySelectorAll(".choice-buttons .btn");
for (let i = 0; i < buttons.length; i++) {
  if (buttons[i].classList.contains("btn-disabled")) continue;
  buttons[i].addEventListener("click", choiceClickListener);
}

const enterQueue = function () {
  const queueButton = document.querySelector("#queue");
  queueButton.classList.add("queue-button-active");
  queueButton.innerText = "🛑 Leave queue";
  queueing = true;
};
socket.on("queue-entered", ({ side }) => {
  enterQueue();
  queueSettings.side = side;
  queueSettingsDisplay("side", side);
});

const leaveQueue = function () {
  const queueButton = document.querySelector("#queue");
  queueButton.classList.remove("queue-button-active");
  queueButton.innerText = "🔀 Queue!";
  queueing = false;
};
socket.on("not-queued", () => {
  leaveQueue();
});

const queueButtonClickListener = function (event) {
  if (queueing) {
    socket.emit("leave-queue");
    return;
  }
  socket.emit("enter-queue", queueSettings);
};
document
  .querySelector("#queue")
  .addEventListener("click", queueButtonClickListener);

socket.on("match-found", () => {
  socket.emit("match-list");
});

socket.on("match-ended", () => {
  socket.emit("match-list");
});

socket.on("match-list", ({ matches }) => {
  const matchesDiv = document.querySelector("#matches");
  if (matches.length) {
    matchesDiv.classList.remove("hidden");
  } else {
    matchesDiv.classList.add("hidden");
  }

  const matchButtons = document.querySelectorAll("#matches .btn");

  for (let i = 0; i < matchButtons.length; i++) {
    matchButtons[i].remove();
  }

  const matchesTitle = document.querySelector("#matches p");
  for (let i in matches) {
    let newButton = document.createElement("a");
    newButton.classList.add("btn");
    newButton.innerText = `⚔️ ...against ${matches[i].opponentName}, as the ${matches[i].side}.`;
    newButton.href = `/match/${matches[i].snowflake}`;
    matchesTitle.after(newButton);
  }
});

socket.connect();
socket.emit("queue-state");
socket.emit("match-list");
