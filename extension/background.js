const DEFAULT_API_BASE = "http://localhost:8000";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "check-deepfake",
    title: "Check for Deepfake",
    contexts: ["image"],
  });
});

async function getApiBaseUrl() {
  const { apiBaseUrl } = await chrome.storage.sync.get({
    apiBaseUrl: DEFAULT_API_BASE,
  });
  return (apiBaseUrl || DEFAULT_API_BASE).replace(/\/$/, "");
}

async function ensureApiHostPermission(apiBase) {
  let origin;
  try {
    origin = `${new URL(apiBase).origin}/*`;
  } catch {
    throw new Error("Invalid API URL configured in the extension popup.");
  }

  const allowed = await chrome.permissions.contains({ origins: [origin] });
  if (allowed) {
    return;
  }

  const granted = await chrome.permissions.request({ origins: [origin] });
  if (!granted) {
    throw new Error(
      "Permission denied. Allow host access for your API URL in the extension popup.",
    );
  }
}

async function setSessionState(state) {
  await chrome.storage.session.set({ deepfakeCheck: state });
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "check-deepfake" || !info.srcUrl) {
    return;
  }

  const imageUrl = info.srcUrl;

  await setSessionState({
    status: "loading",
    imageUrl,
    startedAt: Date.now(),
  });

  try {
    const apiBase = await getApiBaseUrl();
    await ensureApiHostPermission(apiBase);
    const response = await fetch(`${apiBase}/api/detect-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: imageUrl }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg || String(d)).join("; ")
            : `Request failed (${response.status})`;
      throw new Error(message);
    }

    await setSessionState({
      status: "done",
      imageUrl,
      result: data,
      finishedAt: Date.now(),
    });
  } catch (err) {
    await setSessionState({
      status: "error",
      imageUrl,
      error: err instanceof Error ? err.message : String(err),
      finishedAt: Date.now(),
    });
  }

  try {
    await chrome.action.openPopup();
  } catch {
    // Popup may already be open or openPopup unavailable; user can click the icon.
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_CHECK_STATE") {
    chrome.storage.session.get("deepfakeCheck").then((data) => {
      sendResponse(data.deepfakeCheck ?? { status: "idle" });
    });
    return true;
  }
  return false;
});
