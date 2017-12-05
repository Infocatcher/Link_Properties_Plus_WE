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
}
function openOptions() {
	browser.runtime.openOptionsPage();
}

function $(id) {
	return document.getElementById(id);
}