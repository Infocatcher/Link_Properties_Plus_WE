var params = new URL(location).searchParams;
$("url").value = params.get("url");
$("referer").value = params.get("referer");

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
	sendRequest(url, referer);
}
function sendRequest(url, referer) {
	var request = new XMLHttpRequest();
	request.open("HEAD", url, true);
	// Doesn't work: Attempt to set a forbidden header was denied: Referer
	referer && request.setRequestHeader("Referer", referer);
	request.send();
	request.onreadystatechange = function() {
		if(this.readyState == this.HEADERS_RECEIVED) {
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
	$("headers").innerHTML = headers.split(/[\r\n]+/).map(function(line) {
		if(/^([^:]+)\s*:\s*(.*)$/.test(line)) {
			return '<strong class="name">' + safeHTML(RegExp.$1) + '</strong>'
				+ '<span class="colon">: </span>'
				+ '<span class="value">' + safeHTML(RegExp.$2) + '</span>'
		}
		return '<span class="buggy">' + safeHTML(line) + '</span>';
	}).join("<br/>\n");
}

function openOptions() {
	browser.runtime.openOptionsPage();
}

function $(id) {
	return document.getElementById(id);
}
function safeHTML(s) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}