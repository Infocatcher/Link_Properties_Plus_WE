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
	openLinkProperties(info.linkUrl, info.frameUrl, tab, true);
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
	var p = prefs.windowPosition || {};
	var url = getPropertiesURL(url, ref, autoStart);
	if(prefs.openInTab) {
		browser.tabs.create({
			url: url,
			openerTabId: sourceTab.id,
			active: true
		});
	}
	else {
		browser.windows.create({
			url: url,
			type: "popup",
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
}