var params = new URL(location).searchParams;
$("url").value = params.get("url");
$("referer").value = params.get("referer");
if(params.get("autostart") == 1)
	getProperties();

var handlers = {
	get: getProperties,
	options: openOptions
};
for(var id in handlers)
	$(id).addEventListener("click", handlers[id]);

addEventListener("beforeunload", function() { // Note: can't save on unload
	browser.storage.local.set({
		windowPosition: {
			x: screenX,
			y: screenY,
			w: outerWidth,
			h: outerHeight
		}
	});
}, { once: true });
addEventListener("unload", function() {
	for(var id in handlers)
		$(id).removeEventListener("click", handlers[id]);
}, { once: true });

function getProperties() {
	var url = $("url").value;
	var referer = $("referer").value;
	getTabId(function(tabId) {
		sendRequest(url, referer, tabId);
	});
}
function sendRequest(url, referer, tabId) {
	var request = new XMLHttpRequest();
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
		spacer.className = "spacer";
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
	$("size").textContent = size;

	var date = request.getResponseHeader("Last-Modified");
	$("date").textContent = date;

	var type = request.getResponseHeader("Content-Type");
	$("type").textContent = type;

	var status = request.status;
	$("status").textContent = status;

	var direct = request.responseURL;
	$("direct").textContent = direct;

	var headers = request.getAllResponseHeaders() || "";
	var block = document.createElement("div");
	block.className = "block";
	block.innerHTML = headers.split(/[\r\n]+/).map(function(line) {
		if(/^([^:]+)\s*:\s*(.*)$/.test(line))
			return headerHTML(RegExp.$1, RegExp.$2);
		return '<span class="buggy">' + safeHTML(line) + '</span>';
	}).join("<br/>\n");
	$("headers").appendChild(block);
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
	return '<strong class="name">' + safeHTML(name) + '</strong>'
		+ '<span class="colon">: </span>'
		+ '<span class="value">' + safeHTML(val) + '</span>';
}
function safeHTML(s) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}