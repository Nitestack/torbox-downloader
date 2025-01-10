const ids = [
  "torboxApiKey",
  "discordGamesWebhookURL",
  "discordOthersWebhookURL",
];

browser.storage.local.get(ids).then((result) => {
  for (const [id, value] of Object.entries(result)) {
    document.getElementById(id).defaultValue = value;
  }
});

document.getElementById("options-form").addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);

  /** @type {Record<string, string>} */
  const newStorage = {};

  for (const id of ids) {
    newStorage[id] = formData.get(id) ?? null;
  }

  browser.storage.local.set(newStorage).then(() => {
    document.getElementById("status").textContent =
      "Successfully saved preferences!";
    setTimeout(() => {
      document.getElementById("status").textContent = null;
    }, 5000);
  });
});
