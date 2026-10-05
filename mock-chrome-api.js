/**
 * BioTailr AI - Standalone Test Mock for Chrome Extension APIs
 * Allows full in-browser testing of Extension Popup, Background Port, and Content Script runners.
 */

(function() {
  // If running inside actual Chrome extension with real runtime, do not override
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
    return;
  }

  const listeners = [];
  const tabListeners = { activated: [], updated: [] };
  const storageData = {};

  const mockPort = {
    name: 'biotailr-sidepanel',
    postMessage: function(msg) {
      listeners.forEach(cb => {
        try { cb(msg, { id: 'test-runner' }, () => {}); } catch(e) {}
      });
    },
    onMessage: {
      addListener: function(cb) { listeners.push(cb); }
    },
    onDisconnect: {
      addListener: function() {}
    }
  };

  const mockTabTarget = {
    id: 101,
    url: 'https://www.linkedin.com/jobs/view/3892019482',
    title: 'Senior Software Development Engineer (AI & Distributed Systems) - Axodian Technologies',
    status: 'complete'
  };

  window.mockTabTarget = mockTabTarget;
  window.chrome = window.chrome || {};

  window.chrome.storage = {
    local: {
      get: function(keys, cb) {
        const res = {};
        if (Array.isArray(keys)) {
          keys.forEach(k => { res[k] = storageData[k]; });
        } else if (typeof keys === 'string') {
          res[keys] = storageData[keys];
        } else if (keys && typeof keys === 'object') {
          Object.keys(keys).forEach(k => { res[k] = storageData[k] !== undefined ? storageData[k] : keys[k]; });
        } else {
          Object.assign(res, storageData);
        }
        if (cb) setTimeout(() => cb(res), 10);
        return Promise.resolve(res);
      },
      set: function(obj, cb) {
        Object.assign(storageData, obj);
        if (cb) setTimeout(cb, 10);
        return Promise.resolve();
      }
    }
  };

  window.chrome.tabs = {
    query: function(opts) {
      const activeTab = (window.parent && window.parent.mockTabTarget) || mockTabTarget;
      return Promise.resolve([activeTab]);
    },
    sendMessage: function(tabId, message) {
      if (window.handleContentScriptMessage) {
        return Promise.resolve(window.handleContentScriptMessage(message));
      }
      if (window.parent && window.parent.handleContentScriptMessage) {
        return Promise.resolve(window.parent.handleContentScriptMessage(message));
      }
      return Promise.resolve({ success: false, reason: 'No mock content script handler registered' });
    },
    onActivated: {
      addListener: function(cb) { tabListeners.activated.push(cb); }
    },
    onUpdated: {
      addListener: function(cb) { tabListeners.updated.push(cb); }
    },
    create: function(opts) {
      return Promise.resolve({ id: 999, ...opts });
    },
    update: function(tabId, opts) {
      return Promise.resolve({ id: tabId, ...opts });
    },
    remove: function() { return Promise.resolve(); }
  };

  window.chrome.runtime = {
    connect: function(opts) {
      return mockPort;
    },
    sendMessage: function(message) {
      listeners.forEach(cb => {
        try { cb(message, { tab: mockTabTarget }, () => {}); } catch(e) {}
      });
      if (window.parent && window.parent.chrome && window.parent.chrome.runtime) {
        try { window.parent.chrome.runtime.sendMessage(message); } catch(e) {}
      }
      return Promise.resolve({ ok: true });
    },
    onMessage: {
      addListener: function(cb) { listeners.push(cb); }
    },
    lastError: null
  };

  window.chrome.scripting = {
    executeScript: function() {
      return Promise.resolve([]);
    }
  };

  // Cross-frame messaging bridge
  window.addEventListener('message', (ev) => {
    if (ev.data && ev.data.__biotailr_mock_msg) {
      listeners.forEach(cb => {
        try { cb(ev.data.__biotailr_mock_msg, { id: 'parent-runner' }, () => {}); } catch(e) {}
      });
    }
  });

  window.triggerMockTabChange = function(newUrl, newTitle) {
    mockTabTarget.url = newUrl;
    mockTabTarget.title = newTitle;
    tabListeners.activated.forEach(cb => cb({ tabId: mockTabTarget.id }));
    tabListeners.updated.forEach(cb => cb(mockTabTarget.id, { status: 'complete', url: newUrl }, mockTabTarget));
  };
})();
