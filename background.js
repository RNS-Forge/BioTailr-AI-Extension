/**
 * BioTailr AI - Background Service Worker (Manifest V3)
 * Configures Right Side Panel and relays messages between:
 * - content-webapp.js (running in BioTailr web app tab)
 * - popup.js (running in the side panel)
 */

// Track the side panel's port so we can send it messages
let sidePanelPort = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('BioTailr AI Extension v1.1 installed successfully.');
});

// Enable Chrome Right Side Panel on extension icon click
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.warn('Could not set sidePanel behavior:', error));
}

// Track ports from the side panel for push messaging
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'biotailr-sidepanel') {
    sidePanelPort = port;
    port.onDisconnect.addListener(() => {
      sidePanelPort = null;
    });
  }
});

/**
 * Relay messages from content scripts and other extension pages.
 * Key relay paths:
 *   content-webapp.js → RESUME_READY    → popup.js side panel
 *   content-webapp.js → EXT_JOB_ERROR  → popup.js side panel
 *   popup.js          → TAB_CHANGED    (internal only)
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward RESUME_READY and error signals from the web app content script to side panel
  if (message.action === 'RESUME_READY' || message.action === 'EXT_JOB_ERROR') {
    // Try via port first (reliable when panel is open)
    if (sidePanelPort) {
      try {
        sidePanelPort.postMessage(message);
        sendResponse({ ok: true });
        return true;
      } catch (e) {
        sidePanelPort = null;
      }
    }
    // Fallback: broadcast to all extension pages (side panel will catch it)
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  // Close the processing tab once the resume is delivered
  if (message.action === 'CLOSE_PROCESSING_TAB' && sender.tab?.id) {
    chrome.tabs.remove(sender.tab.id).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }

  return false;
});

// Forward tab activation/updates to popup/side panel for real-time job-page detection
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    // Do not relay messages from the BioTailr processing tab
    if (tab.url && tab.url.includes('rns-forge.github.io/BioTailr-AI')) return;
    chrome.runtime.sendMessage({ action: 'TAB_CHANGED', tab }).catch(() => {});
  } catch (e) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    if (tab.url && tab.url.includes('rns-forge.github.io/BioTailr-AI')) return;
    chrome.runtime.sendMessage({ action: 'TAB_UPDATED', tab }).catch(() => {});
  }
});
