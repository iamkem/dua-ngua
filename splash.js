const firebase = require("firebase/compat/app");
require("firebase/compat/firestore");

import Store from "./store.js";

const playButton = document.getElementById("playButton");
const nameInput = document.getElementById("nameInput");

const db = firebase.firestore();

const players = db.collection("players");

function createPlayer(name) {
  players
    .add({ name })
    .then((docRef) => {
      alert("Create player successfully");

      Store.set("player", { id: docRef.id, name });
    })
    .catch((error) => {
      console.error("Error adding document: ", error);
    });
}

function isExistPlayer(name) {
  return players
    .where("name", "==", name)
    .get()
    .then((querySnapshot) => {
      return !querySnapshot.empty;
    });
}

playButton.addEventListener("click", async () => {
  const name = nameInput.value.trim();

  if (name) {
    const isExist = await isExistPlayer(name);

    if (isExist) {
      return alert("This username is already exist");
    }

    return createPlayer(name);
  }

  alert("Please enter your username");
});
