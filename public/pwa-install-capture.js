(function captureSetBookInstallPrompt() {
  if (window.__setbookInstallCaptureReady) return;
  window.__setbookInstallCaptureReady = true;

  window.addEventListener("beforeinstallprompt", function (event) {
    event.preventDefault();
    window.__setbookInstallPrompt = event;
    window.dispatchEvent(new Event("setbook:install-prompt-available"));
  });

  window.addEventListener("appinstalled", function () {
    window.__setbookInstallPrompt = null;
  });
})();
