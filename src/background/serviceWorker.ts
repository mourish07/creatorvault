// CreatorVault — Background Service Worker
// Handles extension lifecycle events and cross-context messaging.

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[CreatorVault] Extension installed.');
  } else if (details.reason === 'update') {
    console.log('[CreatorVault] Extension updated.');
  }
});

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({
      url: chrome.runtime.getURL('dashboard.html'),
    });
    sendResponse({ success: true });
  }

  if (message.type === 'GET_CURRENT_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Keep message channel open for async response
  }

  return false;
});

export {};
