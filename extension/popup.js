const APP_URL = "https://focustask-ten.vercel.app";

async function capture() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  const title = encodeURIComponent(tab.title || "Captured from browser");
  const url = encodeURIComponent(tab.url || "");
  const notes = encodeURIComponent("Captured from browser extension");

  const target = `${APP_URL}/?capture=1&title=${title}&url=${url}&notes=${notes}`;
  await chrome.tabs.create({ url: target });
  window.close();
}

document.getElementById("capture")?.addEventListener("click", capture);
