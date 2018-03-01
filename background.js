readPrefs(function() {
	_log("Prefs loaded");
});

browser.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	if(msg.action == "getTabId")
		sendResponse(sender.tab && sender.tab.id);
});

browser.contextMenus.create({
	id: "linkProperties",
	title: browser.i18n.getMessage("linkProperties"),
	contexts: ["link"]
});

browser.contextMenus.onClicked.addListener(function(info, tab) {
	var miId = info.menuItemId;
	_log("contextMenus.onClicked: " + miId);
	openLinkProperties(info.linkUrl, info.frameUrl || info.pageUrl, tab, true);
});


browser.browserAction.onClicked.addListener(function() {
	_log("browserAction.onClicked");
	browser.tabs.query({ currentWindow: true, active: true }).then(function(tabsInfo) {
		openLinkProperties("", tabsInfo[0].url, tabsInfo[0]);
	}, _err);
});
//browser.commands.onCommand.addListener(function(command) {
//	_log("commands.onCommand: " + command);
//});

var broadcastChannel = new BroadcastChannel("LPP:windowPosition");
broadcastChannel.onmessage = function(msg) {
	_log("Save window position using BroadcastChannel");
    browser.storage.local.set(msg.data);
};
addEventListener("unload", function() {
    broadcastChannel.close();
}, { once: true });

function openLinkProperties(url, ref, sourceTab, autoStart) {
	var url = getPropertiesURL(url, ref, autoStart);
	findTabByURL(url, function(tab) {
		if(tab) {
			_log("Found already opened tab -> activate");
			browser.tabs.update(tab.id, { active: true });
			browser.windows.update(tab.windowId, { focused: true, drawAttention: true });
		}
		else if(prefs.openInTab)
			openLinkPropertiesInTab(url, sourceTab.id);
		else
			openLinkPropertiesInWindow(url, sourceTab);
	});
}
function findTabByURL(url, callback) {
	browser.tabs.query({
		url: normalizeURL(url) // Should be normalized: ?url=https%3A%2F%2F -> ?url=https%3A//
	}).then(function(tabs) {
		callback(tabs && tabs.length && tabs[0]);
	}, _err);
}
function openLinkPropertiesInTab(url, openerTabId) {
	browser.tabs.create({
		url: url,
		openerTabId: openerTabId,
		active: true
	});
}
function openLinkPropertiesInWindow(url, sourceTab) {
	var p = prefs.windowPosition || {};
	browser.windows.create({
		url: url,
		type: "popup",
		incognito: sourceTab.incognito,
		// Note: left and top will be ignored
		//left:   p.x || 0,
		//top:    p.y || 0,
		width:  p.w || 640,
		height: p.h || 480
	}).then(function(win) {
		// Force move window (note: looks buggy)
		//browser.windows.update(win.id, {
		//	left:   p.x || 0,
		//	top:    p.y || 0
		//});
	});
}