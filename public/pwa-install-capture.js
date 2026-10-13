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

  function showInstallResult(source, result) {
    var status = document.querySelector(
      '[data-setbook-install-status="' + source + '"]',
    );
    if (!status) return;
    var messages = {
      installed: "SetBook is already installed.",
      instructions: "In Safari, tap Share, then Add to Home Screen.",
      unavailable:
        "Use the install icon in the address bar or your browser’s install-app option.",
      dismissed: "No problem. You can install later from Help.",
      accepted: "Installation started.",
    };
    status.textContent = messages[result] || "";
    status.hidden = false;
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var button = target instanceof Element && target.closest("[data-setbook-install]");
    if (!button) return;
    var source = button.getAttribute("data-setbook-install");
    if (typeof window.__setbookInstall !== "function") {
      showInstallResult(source, "unavailable");
      return;
    }
    window.__setbookInstall().then(function (result) {
      showInstallResult(source, result);
    });
  });
})();
