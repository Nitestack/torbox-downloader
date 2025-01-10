const torboxApiUrl = "https://api.torbox.app/v1/api";

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local
    .get(["torboxApiKey", "discordGamesWebhookURL", "discordOthersWebhookURL"])
    .then((result) => {
      const torboxApiToken = result.torboxApiKey;
      const gamesWebhookUrl = result.discordGamesWebhookURL;
      const othersWebhookUrl = result.discordOthersWebhookURL;

      browser.contextMenus.create({
        id: "download-magnet",
        title: "Download magnet: with TorBox",
        contexts: ["link"],
      });

      browser.contextMenus.create({
        id: "upload-torrent",
        title: "Upload and download .torrent with TorBox",
        contexts: ["all"],
      });

      browser.contextMenus.onClicked.addListener(({ menuItemId, linkUrl }) => {
        if (!torboxApiToken)
          return notify("An error occurred", "Missing TorBox API Key!");
        if (menuItemId === "download-magnet") {
          if (
            !linkUrl ||
            !linkUrl.match(/magnet:\?xt=urn:btih:[0-9a-fA-F]{40,}.*/i)
          )
            return notify("An error occurred", "Invalid magnet link!");
          const data = new FormData();
          data.append("magnet", linkUrl);
          download_source(data);
        } else if (menuItemId === "upload-torrent") {
          const fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.style.display = "none";
          fileInput.accept = ".torrent";
          document.body.appendChild(fileInput);
          fileInput.click();

          fileInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file) {
              if (!file.name.endsWith(".torrent")) return;
              const data = new FormData();
              data.append("file", file);
              download_source(data);
            } else notify("An error occurred", "No files were uploaded!");
            document.body.removeChild(fileInput);
          });
        }
      });

      /**
       * @param {FormData} formData
       */
      async function download_source(formData) {
        try {
          const response = await fetch(
            `${torboxApiUrl}/torrents/createtorrent`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${torboxApiToken}`,
              },
              body: formData,
            },
          );
          const createData = await response.json();
          if (!createData.success) throw new Error(createData.detail);
          const {
            data: { torrent_id, hash },
          } = createData;
          if (!torrent_id) throw new Error("Torrent was queued.");
          const [dlLinkResponse, torrentInfoResponse] = await Promise.all([
            fetch(
              `${torboxApiUrl}/torrents/requestdl?token=${torboxApiToken}&torrent_id=${torrent_id}&zip_link=true`,
              {
                method: "GET",
              },
            ),
            fetch(`${torboxApiUrl}/torrents/torrentinfo?hash=${hash}`, {
              method: "GET",
            }),
          ]);
          const [dlData, torrentData] = await Promise.all([
            dlLinkResponse.json(),
            torrentInfoResponse.json(),
          ]);
          if (!dlData.success) throw new Error(dlData.detail);
          if (!torrentData.success) throw new Error(torrentData.detail);

          const { data: zipUrl } = dlData;
          const {
            data: { name },
          } = torrentData;

          await browser.tabs.create({ url: zipUrl });
          notify(`Download`, `Downloading ${name}`);

          const webhookUrl =
            name.toLowerCase().includes("dodi") ||
            name.toLowerCase().includes("fitgirl")
              ? gamesWebhookUrl
              : othersWebhookUrl;
          if (!webhookUrl) return;
          fetch(webhookUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: `[${name}](${zipUrl}) ||@everyone||`,
            }),
          });
        } catch (err) {
          notify("An error occurred", err.message);
        }
      }
    });
});

/**
 * @param {string} title
 * @param {string} message
 */
function notify(title, message) {
  browser.notifications.create({
    type: "basic",
    title: `${title} - TorBox Download`,
    message,
  });
}
