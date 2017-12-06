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
}

function openOptions() {
	browser.runtime.openOptionsPage();
}

function $(id) {
	return document.getElementById(id);
}