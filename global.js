const LOG_PREFIX = "[Link Properties Plus WE] ";

var prefs = {
	debug: true,

	openInTab: false,
	windowPosition: {},

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