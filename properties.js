readPrefs(function() {
	_log("Prefs loaded");
	loadState(true);
	showItems();
});
setTimeout(function() {
	var root = document.documentElement;
	var bg = window.getComputedStyle(root, null).backgroundColor;
	if(/^rgb\((\d+), *(\d+), *(\d+)\)$/.test(bg)) {
		var r = +RegExp.$1, g = +RegExp.$2, b = +RegExp.$3;
		var brightness = Math.max(r/255, g/255, b/255); // HSV, 0..1
		if(brightness < 0.4)
			root.classList.add("darkBG");
	}
}, 0);
function loadState(forceReplaceState) {
	var params = new URL(location).searchParams;
	var url = $("url").value = mayDecodeURL(params.get("url") || "");
	var ref = $("referer").value = mayDecodeURL(params.get("referer") || "");
	setState(url, ref, forceReplaceState);
	setURL();
	if(url && params.get("autostart") == 1)
		getProperties();
}
function showItems() {
	var cl = $("output").classList;
	cl.toggle("hide-status", !prefs.showResponseStatus);
	cl.toggle("hide-direct", !prefs.showDirectURI);
	cl.toggle("hide-headers", !prefs.showHttpHeaders);
}
function onPrefChanged(key, newVal) {
	if(key.startsWith("show"))
		showItems();
	else if(
		[
			"decodeURIs",
			"localeDates",
			"localeNumbers",
			"precision",
			"useBinaryPrefixes"
		].indexOf(key) != -1
	)
		showProperties();
}

browser.windows.getCurrent().then(function(win) {
	if(win.type != "popup")
		return;

	// Workaround for empty window with disabled e10s mode
	browser.windows.update(win.id, {
		height: win.height + 1
	}).then(function() {
		browser.windows.update(win.id, {
			height: win.height
		});
	});

	addEventListener("beforeunload", function() { // Note: can't save on unload
		var storageData = {
			windowPosition: {
				x: screenX,
				y: screenY,
				w: outerWidth,
				h: outerHeight
			}
		};

		// Workaround to save state with disabled e10s mode
		var broadcastChannel = new BroadcastChannel("LPP:windowPosition");
		broadcastChannel.postMessage(storageData);
		broadcastChannel.close();

		browser.storage.local.set(storageData).then(function() {
			_log("Save window position using direct browser.storage.local.set() call");
		}, _err);
	}, { once: true });
});

var handlers = {
	url: {
		change: setURL,
		input:  setURLDelayed
	},
	referer: { dblclick: setReferer    },
	get:     { click:    getProperties },
	options: { click:    openOptions   },
	"dl-url":    { click: downloadURL },
	"dl-direct": { click: downloadURL }
};
for(var id in handlers)
	for(var e in handlers[id])
		$(id).addEventListener(e, handlers[id][e]);

function onPopState(e) {
	_log("onPopState() -> loadState()");
	loadState();
}
addEventListener("popstate", onPopState);
addEventListener("keydown", onKeyDown, true);

addEventListener("unload", function() {
	for(var id in handlers)
		for(var e in handlers[id])
			$(id).removeEventListener(e, handlers[id][e]);
	removeEventListener("popstate", onPopState);
	removeEventListener("keydown", onKeyDown, true);
	sendRequest.cleanup && sendRequest.cleanup();
	showProperties.lastArgs = null;
}, { once: true });

function setURL() {
	$("link-url").href = $("dl-url").href = $("url").value;
}
function setURLDelayed() {
	if(setURLDelayed.timer || 0)
		return;
	setURLDelayed.timer = setTimeout(function() {
		setURLDelayed.timer = 0;
		setURL();
	}, 200);
}
function setReferer(e) {
	var ref = $("referer");
	if(ref.value || e.button != 0)
		return;
	var url = $("url").value;
	var hasMod = e.ctrlKey || e.shiftKey || e.altKey || e.metaKey;
	ref.value = !hasMod && /^[^:]+:\/*[^\/]+\/?/.test(url) // https://example.com/foo/bar
		? RegExp.lastMatch // https://example.com/
		: url;
}
function getProperties() {
	_log("getProperties()");
	var url = inputURL("url");
	// Force encode into %XX format (Unicode characters not supported as referer)
	var referer = normalizeURL(inputURL("referer"));
	setState(mayDecodeURL(url), mayDecodeURL(referer));
	for(var node of $("output").getElementsByClassName("value"))
		node.textContent = node.title = "";
	getTabId(function(tabId) {
		_log("getProperties() -> sendRequest() for tab #" + tabId);
		sendRequest(url, referer, tabId);
	});
}
function inputURL(id) {
	var inp = $(id);
	var url = inp.value;
	if(url && !/^[^:./]+:/.test(url) && !isValidURL(url)) {
		notifyUI("fixedURL#" + id);
		return inp.value = "http://" + url;
	}
	return url;
}
function isValidURL(url) {
	try {
		return !!new URL(url);
	}
	catch(e) {
	}
	return false;
}
function sendRequest(url, referer, tabId) {
	sendRequest.cleanup && sendRequest.cleanup();
	$("get").disabled = true;
	var request = sendRequest.request = new XMLHttpRequest();
	request._requestURL = normalizeURL(url); // Perform fixups like http://example.com -> http://example.com/
	request.open("HEAD", url, true);
	// Doesn't work: Attempt to set a forbidden header was denied: Referer
	//referer && request.setRequestHeader("Referer", referer);

	var hasHeaders;
	var redirects = [];
	var filter = {
		urls: ["<all_urls>"],
		tabId: tabId
	};
	function onBeforeSendHeaders(e) {
		var headers = e.requestHeaders;
		(function getRefererHeader() {
			for(var header of headers)
				if(header.name.toLowerCase() == "referer")
					return header;
			headers.push((header = { name: "Referer" }));
			return header;
		})().value = referer;
		return { requestHeaders: headers };
	}
	function onSendHeaders(e) {
		request._directURL = e.url;
		if(hasHeaders)
			return;
		hasHeaders = true;
		var df = document.createDocumentFragment();
		var caption = document.createElement("h1");
		caption.className = "header-caption header-expanded";
		caption.innerHTML = '<span class="header-twisty"></span>' + safeHTML(browser.i18n.getMessage("request"));
		caption.addEventListener("click", toggleHeaderSection);
		df.appendChild(caption);
		var block = document.createElement("div");
		block.className = "header-block";
		block.innerHTML = e.requestHeaders.map(function(header) {
			return headerHTML(header.name, header.value);
		}).join("\n");
		df.appendChild(block);
		var spacer = document.createElement("div");
		spacer.className = "header-spacer";
		spacer.appendChild(document.createElement("br"));
		df.appendChild(spacer);
		$("headers").appendChild(df);
	}
	function onBeforeRedirect(e) {
		if(!redirects.length)
			redirects.push(e.url);
		redirects.push(e.redirectUrl);
	}
	browser.webRequest.onBeforeSendHeaders.addListener(
		onBeforeSendHeaders,
		filter,
		["blocking", "requestHeaders"]
	);
	browser.webRequest.onSendHeaders.addListener(
		onSendHeaders,
		filter,
		["requestHeaders"]
	);
	browser.webRequest.onBeforeRedirect.addListener(
		onBeforeRedirect,
		filter
	);
	var cleanup = sendRequest.cleanup = function() {
		if(redirects.length > 1) {
			$("direct").title = redirects.map(function(url, i) {
				return (i ? "⇒ " : browser.i18n.getMessage("redirectsHeader", redirects.length - 1) + "\n")
					+ mayDecodeURL(url);
			}).join("\n");
		}
		sendRequest.cleanup = sendRequest.request = null;
		browser.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
		browser.webRequest.onSendHeaders.removeListener(onSendHeaders);
		browser.webRequest.onBeforeRedirect.removeListener(onBeforeRedirect);
		request.onreadystatechange = request.onabort = request.onerror = null;
		request.abort();
	};

	request.onreadystatechange = function() {
		if(this.readyState == this.HEADERS_RECEIVED) {
			_log("sendRequest() -> headers received");
			$("get").disabled = false;
			showProperties(request);
			cleanup();
		}
	};
	request.onabort = request.onerror = function(e) {
		_log("sendRequest(): " + e.type + " " + url);
		$("get").disabled = false;
		showProperties(request, e.type == "error" && e);
		cleanup();
	};
	request.send();
	_log("sendRequest(): send() for " + url);
}
function showProperties(request, error) {
	if(request)
		showProperties.lastArgs = [request, error];
	else
		[request, error] = showProperties.lastArgs || [];

	var size = request.getResponseHeader("Content-Length");
	var intSize = parseInt(size);
	if(intSize >= 0) {
		size = formatNum(intSize, 0);

		var useBinaryPrefixes = prefs.useBinaryPrefixes;
		var k = useBinaryPrefixes ? 1024 : 1000;
		var type, g;
		if     (intSize >= k*k*k*k) type = "terabytes", g = k*k*k*k;
		else if(intSize >= k*k*k)   type = "gigabytes", g = k*k*k;
		else if(intSize >= k*k)     type = "megabytes", g = k*k;
		else if(intSize >= k/2)     type = "kilobytes", g = k;

		if(type && useBinaryPrefixes)
			type = type.replace(/^(..)../, "$1bi");

		$("size").textContent = type
			? browser.i18n.getMessage(type, [formatNum(intSize/g), size])
			: browser.i18n.getMessage("bytes", size);
	}

	var date = request.getResponseHeader("Last-Modified")
		|| request.getResponseHeader("X-Archive-Orig-Last-Modified")
		|| "";
	var dt = date && new Date(date);
	if(!dt || isNaN(dt))
		$("date").title = date;
	else try {
		$("date").textContent = dt.toLocaleString(prefs.localeDates || undefined);
	}
	catch(e) {
		_err(e);
		$("date").textContent = dt.toLocaleString(); // Fallback for "invalid language tag" error
	}

	var type = request.getResponseHeader("Content-Type");
	$("type").textContent = type;

	var status = request._status = request._status || request.status;
	var statusText = request._statusText = request._statusText || request.statusText;
	var statusStr = status + (statusText ? " " + statusText : "");
	if(status >= 400 && status < 600)
		$("status").innerHTML = '<em class="missing">' + safeHTML(statusStr) + '</em>';
	else
		$("status").textContent = statusStr;

	var canResume = request.getResponseHeader("Accept-Ranges") == "bytes" && intSize > 0;
	document.documentElement.classList.toggle("canResume", canResume);
	$("status").classList.toggle("canResume", canResume);
	$("status").title = browser.i18n.getMessage(
		canResume ? "resumeDownloadShouldBe" : "resumeDownloadShouldNot"
	);

	// Note: request.responseURL doesn't contain #hash part
	var directRaw = request._directURL || request.responseURL;
	var direct = mayDecodeURL(directRaw);
	var isSame = isSameURL(direct, request._requestURL);
	if(isSame)
		$("direct").innerHTML = '<em class="unchanged">' + safeHTML(direct) + '</em>';
	else
		$("direct").textContent = direct;
	$("link-direct").href = $("dl-direct").href = directRaw;
	$("direct").classList.toggle("changed", direct && !isSame);

	var headers = request.getAllResponseHeaders() || "";
	var block = document.createElement("div");
	block.className = "header-block";
	block.innerHTML = headers && headers.split(/[\r\n]+/).map(function(line) {
		if(/^([^:]+)\s*:\s*(.*)$/.test(line))
			return headerHTML(RegExp.$1, RegExp.$2);
		return '<div class="header-entry"><span class="header-buggy">' + safeHTML(line) + '</span></div>';
	}).join("\n");
	if(block.hasChildNodes()) {
		var caption = document.createElement("h1");
		caption.className = "header-caption header-expanded";
		caption.innerHTML = '<span class="header-twisty"></span>' + safeHTML(browser.i18n.getMessage("response"));
		caption.addEventListener("click", toggleHeaderSection);
		var df = document.createDocumentFragment();
		df.appendChild(caption);
		df.appendChild(block);
		$("headers").appendChild(df);
	}

	for(var node of $("output").getElementsByClassName("value"))
		if(!node.hasChildNodes())
			node.innerHTML = '<em class="missing">' + safeHTML(browser.i18n.getMessage(error ? "error" : "missing")) + '</em>';
}

function onKeyDown(e) {
	var trg = e.target;
	if(e.keyCode == (e.DOM_VK_RETURN || 13)) {
		if(trg.id == "url" || trg.id == "referer")
			getProperties();
	}
	else if(e.keyCode == (e.DOM_VK_ESCAPE || 27)) {
		sendRequest.request && sendRequest.request.abort();
	}
}

function openOptions() {
	browser.runtime.openOptionsPage();
}
function getTabId(callback) {
	browser.runtime.sendMessage({
		action: "getTabId"
	}).then(function onResponse(tabId) {
		callback(tabId);
	}, _err);
}

function downloadURL(e) {
	var a = e.currentTarget;
	e.preventDefault();
	try {
		browser.downloads.download({ url: a.href });
	}
	catch(e) {
		console.error(e);
		notify(e);
	}
}

function $(id) {
	return document.getElementById(id);
}
function setState(url, ref, forceReplaceState) {
	var title = url
		? browser.i18n.getMessage("linkPropertiesTitle", url)
		: browser.i18n.getMessage("linkProperties");
	var pageUrl = getPropertiesURL(url, ref, true);
	var meth = forceReplaceState || isSameURL(pageUrl, location.href)
		? "replaceState"
		: "pushState";
	history[meth]("", "", pageUrl);
	document.title = title;
}
function headerHTML(name, val) {
	return '<div class="header-entry">'
		+ '<strong class="header-name">' + safeHTML(name) + '</strong>'
		+ '<span class="header-colon">: </span>'
		+ '<span class="header-value">' + safeHTML(val) + '</span>'
		+ '</div>';
}
function toggleHeaderSection(e) {
	var caption = e.currentTarget;
	if(e.button != 0 || ("" + caption.ownerDocument.getSelection()))
		return;
	var show = caption.classList.toggle("header-expanded");
	caption.classList.toggle("header-collapsed", !show);
	var section = caption.nextSibling;
	function toggle(node, show) {
		node.style.display = show ? "" : "none";
		if(show && !node.getAttribute("style"))
			node.removeAttribute("style");
	}
	toggle(section, show);
	var spacer = section.nextSibling;
	if(spacer && spacer.className == "header-spacer")
		toggle(spacer, show);
}
function safeHTML(s) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
function notifyUI(reason) {
	var root = document.documentElement;
	clearTimeout(notifyUI.timer || 0);
	root.setAttribute("lpp_notify", reason);
	notifyUI.timer = setTimeout(function() {
		root.removeAttribute("lpp_notify");
	}, 700);
}
function formatNum(n, precision = prefs.precision) {
	return n.toLocaleString(prefs.localeNumbers || undefined, {
		minimumFractionDigits: precision,
		maximumFractionDigits: precision
	});
}
function mayDecodeURL(url) {
	if(prefs.decodeURIs)
		return decodeURL(url);
	return url;
}
function decodeURL(url) {
	// Based on losslessDecodeURI() function from
	// chrome://browser/content/browser.js in Firefox 59.0a1 (2017-12-27)
	var decodeASCIIOnly = !/^(?:https?|file|ftp):/i.test(url);

	// Try to decode as UTF-8 if there's no encoding sequence that we would break.
	if(!/%25(?:3B|2F|3F|3A|40|26|3D|2B|24|2C|23)/i.test(url)) {
		if(decodeASCIIOnly) {
			// This only decodes ascii characters (hex) 20-7e, except 25 (%).
			// This avoids both cases stipulated below (%-related issues, and \r, \n
			// and \t, which would be %0d, %0a and %09, respectively) as well as any
			// non-US-ascii characters.
			url = url.replace(/%(2[0-4]|2[6-9a-f]|[3-6][0-9a-f]|7[0-9a-e])/g, decodeURI);
		}
		else {
			try {
				url = decodeURI(url)
					// 1. decodeURI decodes %25 to %, which creates unintended
					//    encoding sequences. Re-encode it, unless it's part of
					//    a sequence that survived decodeURI, i.e. one for:
					//    ';', '/', '?', ':', '@', '&', '=', '+', '$', ',', '#'
					//    (RFC 3987 section 3.2)
					// 2. Re-encode select whitespace so that it doesn't get eaten
					//    away by the location bar (bug 410726). Re-encode all
					//    adjacent whitespace, to prevent spoofing attempts where
					//    invisible characters would push part of the URL to
					//    overflow the location bar (bug 1395508).
					.replace(
						/%(?!3B|2F|3F|3A|40|26|3D|2B|24|2C|23)|[\r\n\t]|\s(?=\s)|\s$/ig,
						encodeURIComponent
					);
			}
			catch(e) {
			}
		}
	}

	// Encode invisible characters (C0/C1 control characters, U+007F [DEL],
	// U+00A0 [no-break space], line and paragraph separator,
	// object replacement character) (bug 452979, bug 909264)
	url = url.replace(/[\u0000-\u001f\u007f-\u00a0\u2028\u2029\ufffc]/g, encodeURIComponent);

	// Encode default ignorable characters (bug 546013)
	// except ZWNJ (U+200C) and ZWJ (U+200D) (bug 582186).
	// This includes all bidirectional formatting characters.
	// (RFC 3987 sections 3.2 and 4.1 paragraph 6)
	url = url.replace(
		/[\u00ad\u034f\u061c\u115f-\u1160\u17b4-\u17b5\u180b-\u180d\u200b\u200e-\u200f\u202a-\u202e\u2060-\u206f\u3164\ufe00-\ufe0f\ufeff\uffa0\ufff0-\ufff8]|\ud834[\udd73-\udd7a]|[\udb40-\udb43][\udc00-\udfff]/g,
		encodeURIComponent
	);
	return url;
}
function isSameURL(url, url2) {
	return normalizeURL(url) == normalizeURL(url2);
}