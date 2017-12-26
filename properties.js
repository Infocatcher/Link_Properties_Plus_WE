readPrefs(function() {
	_log("Prefs loaded");

	var params = new URL(location).searchParams;
	$("url").value = params.get("url");
	$("referer").value = params.get("referer");
	if(params.get("autostart") == 1)
		getProperties();
});

browser.windows.getCurrent().then(function(win) {
	if(win.type == "popup") addEventListener("beforeunload", function() { // Note: can't save on unload
		browser.storage.local.set({
			windowPosition: {
				x: screenX,
				y: screenY,
				w: outerWidth,
				h: outerHeight
			}
		});
	}, { once: true });
});

var handlers = {
	get: getProperties,
	options: openOptions
};
for(var id in handlers)
	$(id).addEventListener("click", handlers[id]);

addEventListener("unload", function() {
	for(var id in handlers)
		$(id).removeEventListener("click", handlers[id]);
}, { once: true });

function getProperties() {
	var url = $("url").value;
	var referer = $("referer").value;
	for(var node of $("output").getElementsByClassName("value"))
		node.textContent = node.title = "";
	getTabId(function(tabId) {
		sendRequest(url, referer, tabId);
	});
}
function sendRequest(url, referer, tabId) {
	var request = new XMLHttpRequest();
	request._requestURL = url;
	request.open("HEAD", url, true);
	// Doesn't work: Attempt to set a forbidden header was denied: Referer
	//referer && request.setRequestHeader("Referer", referer);

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
		var block = document.createElement("div");
		block.className = "block";
		block.innerHTML = e.requestHeaders.map(function(header) {
			return headerHTML(header.name, header.value);
		}).join("<br/>\n");
		$("headers").appendChild(block);
		var spacer = document.createElement("div");
		spacer.className = "header-spacer";
		spacer.appendChild(document.createElement("br"));
		$("headers").appendChild(spacer);
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

	request.send();
	request.onreadystatechange = function() {
		if(this.readyState == this.HEADERS_RECEIVED) {
			browser.webRequest.onBeforeSendHeaders.removeListener(onBeforeSendHeaders);
			browser.webRequest.onSendHeaders.removeListener(onSendHeaders);
			showProperties(request);
			request.abort();
		}
	};
}
function showProperties(request) {
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

	var date = request.getResponseHeader("Last-Modified") || "";
	var dt = date && new Date(date);
	if(!dt || isNaN(dt))
		$("date").title = date;
	else try {
		$("date").textContent = dt.toLocaleString(prefs.localeDates || undefined);
	}
	catch(e) {
		console.error(e);
		$("date").textContent = dt.toLocaleString(); // Fallback for "invalid language tag" error
	}

	var type = request.getResponseHeader("Content-Type");
	$("type").textContent = type;

	var status = request.status;
	var statusText = request.statusText;
	var statusStr = status + (statusText ? " " + statusText : "");
	if(status >= 400 && status < 600)
		$("status").innerHTML = '<em class="missing">' + safeHTML(statusStr) + '</em>';
	else
		$("status").textContent = statusStr;

	var direct = request.responseURL;
	if(direct == request._requestURL)
		$("direct").innerHTML = '<em class="unchanged">' + safeHTML(direct) + '</em>';
	else
		$("direct").textContent = direct;

	var headers = request.getAllResponseHeaders() || "";
	var block = document.createElement("div");
	block.className = "block";
	block.innerHTML = headers.split(/[\r\n]+/).map(function(line) {
		if(/^([^:]+)\s*:\s*(.*)$/.test(line))
			return headerHTML(RegExp.$1, RegExp.$2);
		return '<span class="header-buggy">' + safeHTML(line) + '</span>';
	}).join("<br/>\n");
	$("headers").appendChild(block);

	for(var node of $("output").getElementsByClassName("value"))
		if(!node.hasChildNodes())
			node.innerHTML = '<em class="missing">' + safeHTML(browser.i18n.getMessage("missing")) + '</em>';
}

function openOptions() {
	browser.runtime.openOptionsPage();
}
function getTabId(callback) {
	browser.runtime.sendMessage({
		action: "getTabId"
	}).then(function onResponse(tabId) {
		callback(tabId);
	}, console.error);
}

function $(id) {
	return document.getElementById(id);
}
function headerHTML(name, val) {
	return '<strong class="header-name">' + safeHTML(name) + '</strong>'
		+ '<span class="header-colon">: </span>'
		+ '<span class="header-value">' + safeHTML(val) + '</span>';
}
function safeHTML(s) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}
function formatNum(n, precision = prefs.precision) {
	return n.toLocaleString(prefs.localeNumbers || undefined, {
		minimumFractionDigits: precision,
		maximumFractionDigits: precision
	});
}