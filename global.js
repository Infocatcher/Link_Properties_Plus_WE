const LOG_PREFIX = "[Link Properties Plus WE] ";

var prefs = {
	debug: true,

	openInTab: false,
	windowPosition: {},

	showResponseStatus: true,
	showDirectURI: true,
	showHttpHeaders: true,

	decodeURIs: true,
	localeDates: "",
	localeNumbers: "",
	precision: 2,
	useBinaryPrefixes: true
};

function readPrefs(callback) {
	browser.storage.local.get().then(function(o) {
		browser.storage.onChanged.addListener(function(changes, area) {
			if(area == "local") for(var key in changes)
				_onPrefChanged(key, changes[key].newValue);
		});
		Object.assign(prefs, o);
		callback();

		for(var key in o)
			return; // Prefs already saved
		setTimeout(function() { // Pseudo async
			browser.storage.local.set(prefs);
		}, 5000);
	}, _err);
}
function _onPrefChanged(key, newVal) {
	prefs[key] = newVal;
	onPrefChanged(key, newVal);
}
function onPrefChanged(key, newVal) {
}

function normalizeURL(url) {
	if(url) try {
		return "" + new URL(url);
	}
	catch(e) {
	}
	return url;
}
function getPropertiesURL(url, ref, autoStart) {
	var propsUrl = new URL(browser.extension.getURL("properties.html"));
	var params = propsUrl.searchParams;
	url                        && params.append("url",       url);
	ref && isSafeReferrer(ref) && params.append("referer",   ref);
	autoStart && url           && params.append("autostart", 1);
	return "" + propsUrl;
}
function isSafeReferrer(ref) {
	return /^(?:ftps?|https?):\//i.test(ref);
}
function safeReferrer(ref) {
	return isSafeReferrer(ref) ? ref : "";
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