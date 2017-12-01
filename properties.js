var lppOptions = {
	init: function() {
		var params = new URL(location).searchParams;
		$("url").value = params.get("url");
		$("referer").value = params.get("referer");
	}
};

function $(id) {
	return document.getElementById(id);
}

lppOptions.init();