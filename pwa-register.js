"use strict";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" })
      .then(registration => registration.update())
      .catch(error => console.error("Service worker registration failed.", error));
  });
}
