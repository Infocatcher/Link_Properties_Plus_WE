const LOG_PREFIX = "[Link Properties Plus WE] ";

var prefs = {
	debug: true,
	windowPosition: {}
};
browser.storage.local.get().then(function(o) {
	browser.storage.onChanged.addListener(function(changes, area) {
		if(area == "local") for(var key in changes)
			prefs[key] = changes[key].newValue;
	});
	Object.assign(prefs, o);

	for(var key in o)
		return; // Prefs already saved
	setTimeout(function() { // Pseudo async
		browser.storage.local.set(prefs);
	}, 5000);
}, _err);

browser.contextMenus.create({
	id: "linkProperties",
	title: browser.i18n.getMessage("linkProperties"),
	contexts: ["link"]
});

browser.contextMenus.onClicked.addListener(function(info, tab) {
	var miId = info.menuItemId;
	_log("contextMenus.onClicked: " + miId);
	openLinkProperties(info.linkUrl, info.frameUrl, tab);
});


browser.browserAction.onClicked.addListener(function() {
	_log("browserAction.onClicked");
	browser.tabs.query({ currentWindow: true, active: true }).then(function(tabsInfo) {
		openLinkProperties("", "", tabsInfo[0]);
	}, _err);
});
//browser.commands.onCommand.addListener(function(command) {
//	_log("commands.onCommand: " + command);
//});

function openLinkProperties(url, ref, sourceTab) {
	var p = prefs.windowPosition || {};
	browser.windows.create({
		url: browser.extension.getURL("properties.html")
			+ "?url=" + encodeURIComponent(url)
			+ "&referer=" + encodeURIComponent(ref || sourceTab.url),
		type: "popup",
		left:   p.x || 0,
		top:    p.y || 0,
		width:  p.w || 640,
		height: p.h || 480
	});
}

function notify(msg) {
	browser.notifications.create({
		"type": "basic",
		"iconUrl": browser.extension.getURL("icon-32.png"),
		"title": browser.i18n.getMessage("extensionName"),
		"message": "" + msg // Force stringify to display errors objects
	});
}


function ts() {
	var d = new Date();
	var ms = d.getMilliseconds();
	return d.toTimeString().replace(/^.*\d+:(\d+:\d+).*$/, "$1") + ":" + "000".substr(("" + ms).length) + ms + " ";
}
function _log(s) {
	if(prefs.debug)
		console.log(LOG_PREFIX + ts() + s);
}
function _err(s) {
	console.error(LOG_PREFIX + ts() + s);
}