if (!window.__setbookInstallCaptureReady) {
  window.__setbookInstallCaptureReady = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    window.__setbookInstallPrompt = event as NonNullable<
      typeof window.__setbookInstallPrompt
    >;
    window.dispatchEvent(new Event("setbook:install-prompt-available"));
  });

  window.addEventListener("appinstalled", () => {
    window.__setbookInstallPrompt = null;
  });

  const installMessages: Record<string, string> = {
    installed: "SetBook is already installed.",
    instructions: "In Safari, tap Share, then Add to Home Screen.",
    unavailable:
      "Use the install icon in the address bar or your browser’s install-app option.",
    dismissed: "No problem. You can install later from Help.",
    accepted: "Installation started.",
  };

  function showInstallResult(source: string, result: string) {
    const status = document.querySelector<HTMLElement>(
      `[data-setbook-install-status="${CSS.escape(source)}"]`,
    );
    if (!status) return;
    status.textContent = installMessages[result] ?? "";
    status.hidden = false;
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    const button =
      target instanceof Element
        ? target.closest<HTMLButtonElement>("[data-setbook-install]")
        : null;
    if (!button || button.disabled) return;

    const source = button.dataset.setbookInstall;
    if (!source || typeof window.__setbookInstall !== "function") {
      if (source) showInstallResult(source, "unavailable");
      return;
    }

    button.disabled = true;
    void window
      .__setbookInstall()
      .then((result) => showInstallResult(source, result))
      .catch(() => showInstallResult(source, "unavailable"))
      .finally(() => {
        button.disabled = false;
      });
  });
}
