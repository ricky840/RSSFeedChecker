"use strict";

// Fire when ext installed
chrome.runtime.onInstalled.addListener(function(event) {
  initStorage();

  if (event.reason === 'install') {
    chrome.storage.local.set({freshInstalled: true, extUpdated: false}, function() {
      console.log("Extension Installed");
    });
  }
  if (event.reason === 'update') {
    chrome.storage.local.set({extUpdated: true, freshInstalled: false}, function() {
      console.log("Extension Updated");
    })
  }
});

// Fires when the ext starts(very first time) or when user clicks refresh button in extension page
chrome.runtime.onStartup.addListener(function() {
  initStorage();
});

// Fires when user clicks disable / enable button in extension page
window.onload = function() {
  initStorage();
};

function initStorage() {
  console.log("Initializing Storage");
  // RssList
  chrome.storage.local.get("rssList", function(result) {
    if(_.isUndefined(result['rssList']) || _.isEmpty(result['rssList'])) {
      chrome.storage.local.set({ 
				rssList: []
			});
		}
	});

  // StartFlag
  chrome.storage.local.get("startFlag", function(result) {
    if(_.isUndefined(result['startFlag']) || _.isEmpty(result['startFlag'])) {
      chrome.storage.local.set({ 
				startFlag: false
			});
		}
	});

  // Number of articles
  chrome.storage.local.get("numOfArticle", function(result) {
    if(_.isUndefined(result['numOfArticle']) || _.isEmpty(result['numOfArticle'])) {
      chrome.storage.local.set({ 
				numOfArticle: NUMBER_OF_RSS_CONTENT_TO_FETCH
			});
		}
	});

  // Sleep duration
  chrome.storage.local.get("sleepDuration", function(result) {
    if(_.isUndefined(result['sleepDuration']) || _.isEmpty(result['sleepDuration'])) {
      chrome.storage.local.set({ 
				sleepDuration: SLEEP_DURATION
			});
		}
	});

  // Keywords 
  chrome.storage.local.get("keywords", function(result) {
    if(_.isUndefined(result['keywords']) || _.isEmpty(result['keywords'])) {
      chrome.storage.local.set({ 
				keywords: [] 
			});
		}
	});
}

// Popup Window
chrome.browserAction.onClicked.addListener(function(tab) {
	// See if popup is already open. Only allow one window. Focuse existing window.
  let views = chrome.extension.getViews({type: "tab"});

	if (views.length >= 1) {
		chrome.windows.update(WindowId, { focused: true }, function() {
			console.log("Window focused");
		});
		return false;
	}

  chrome.windows.create({ url: chrome.runtime.getURL("popup.html"), type: "popup" }, function(window) {
    console.log(window);
    WindowId = window.id
    // Do something after open window
  });
});
