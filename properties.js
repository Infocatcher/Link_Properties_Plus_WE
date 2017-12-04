var lppOptions = {
	init: function() {
		var params = new URL(location).searchParams;
		$("url").value = params.get("url");
		$("referer").value = params.get("referer");
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
	}
};

function $(id) {
	return document.getElementById(id);
}

lppOptions.init();