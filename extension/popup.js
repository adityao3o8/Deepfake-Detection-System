const DEFAULT_API_BASE = "http://localhost:8000";

const panels = {
  idle: document.getElementById("idle"),
  loading: document.getElementById("loading"),
  error: document.getElementById("error"),
  result: document.getElementById("result"),
};

const apiInput = document.getElementById("api-base");
const saveApiBtn = document.getElementById("save-api");

function showPanel(name) {
  Object.entries(panels).forEach(([key, el]) => {
    el.classList.toggle("hidden", key !== name);
  });
}

function formatPct(value) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function renderResult(state) {
  const data = state.result;
  const banner = document.getElementById("verdict-banner");
  const confidenceEl = document.getElementById("confidence-value");
  const messageEl = document.getElementById("result-message");
  const urlEl = document.getElementById("result-url");

  urlEl.textContent = state.imageUrl || "";

  if (!data.analysis_performed) {
    banner.textContent = "No face detected";
    banner.className = "banner banner-warn";
    confidenceEl.textContent = "—";
    document.getElementById("real-bar").style.width = "0%";
    document.getElementById("fake-bar").style.width = "0%";
    document.getElementById("real-pct").textContent = "—";
    document.getElementById("fake-pct").textContent = "—";
    messageEl.textContent =
      data.warning || data.message || "Could not analyze this image.";
    showPanel("result");
    return;
  }

  const isFake = data.is_deepfake;
  banner.textContent = isFake ? "Likely deepfake" : "Likely authentic";
  banner.className = `banner ${isFake ? "banner-fake" : "banner-real"}`;

  confidenceEl.textContent = formatPct(data.confidence);
  document.getElementById("real-bar").style.width = formatPct(data.real_confidence);
  document.getElementById("fake-bar").style.width = formatPct(data.fake_confidence);
  document.getElementById("real-pct").textContent = formatPct(data.real_confidence);
  document.getElementById("fake-pct").textContent = formatPct(data.fake_confidence);
  messageEl.textContent = data.message || "";

  showPanel("result");
}

function renderState(state) {
  if (!state || state.status === "idle") {
    showPanel("idle");
    return;
  }

  if (state.status === "loading") {
    document.getElementById("loading-url").textContent = state.imageUrl || "";
    showPanel("loading");
    return;
  }

  if (state.status === "error") {
    document.getElementById("error-message").textContent =
      state.error || "Unknown error";
    document.getElementById("error-url").textContent = state.imageUrl || "";
    showPanel("error");
    return;
  }

  if (state.status === "done") {
    renderResult(state);
    return;
  }

  showPanel("idle");
}

async function loadApiBase() {
  const { apiBaseUrl } = await chrome.storage.sync.get({
    apiBaseUrl: DEFAULT_API_BASE,
  });
  apiInput.value = apiBaseUrl || DEFAULT_API_BASE;
}

async function refreshState() {
  const data = await chrome.storage.session.get("deepfakeCheck");
  renderState(data.deepfakeCheck);
}

saveApiBtn.addEventListener("click", async () => {
  const url = apiInput.value.trim().replace(/\/$/, "") || DEFAULT_API_BASE;
  try {
    const origin = `${new URL(url).origin}/*`;
    const has = await chrome.permissions.contains({ origins: [origin] });
    if (!has) {
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) {
        saveApiBtn.textContent = "Denied";
        setTimeout(() => {
          saveApiBtn.textContent = "Save";
        }, 2000);
        return;
      }
    }
  } catch {
    saveApiBtn.textContent = "Invalid URL";
    setTimeout(() => {
      saveApiBtn.textContent = "Save";
    }, 2000);
    return;
  }

  await chrome.storage.sync.set({ apiBaseUrl: url });
  apiInput.value = url;
  saveApiBtn.textContent = "Saved";
  setTimeout(() => {
    saveApiBtn.textContent = "Save";
  }, 1200);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "session" && changes.deepfakeCheck) {
    renderState(changes.deepfakeCheck.newValue);
  }
});

loadApiBase();
refreshState();
