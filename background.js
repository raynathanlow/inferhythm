"use strict";

const details = {
  reason: "install"
};

chrome.runtime.onInstalled.addListener(function(details) {
  chrome.tabs.create({ url: "index.html" });
});
