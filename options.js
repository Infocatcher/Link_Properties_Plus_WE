function init() {
	readPrefs(loadOptions);
	addEventListener("input", saveOption);
	addEventListener("unload", destroy, { once: true });
}
function destroy() {
	removeEventListener("input", saveOption);
}

function loadOptions() {
	for(var id in prefs)
		loadOption(id, prefs[id]);
	checkSubItems();
}
function loadOption(id, val) {
	var node = $(id);
	node && setValue(node, val);
}
function saveOption(e) {
	var node = e.target;
	if(!(node.id in prefs))
		return;
	(save.prefs || (save.prefs = {}))[node.id] = getValue(node);
	if(!save.timer)
		save.timer = setTimeout(save, Date.now() - (save.last || 0) < 1000 ? 400 : 20);
	checkSubItems();
}
function checkSubItems() {
	$("restoreWindowPosition").disabled = $("openInTab").checked;
}
function save() {
	_log("Save: " + JSON.stringify(save.prefs));
	browser.storage.local.set(save.prefs);
	save.prefs = {};
	save.timer = 0;
	save.last = Date.now();
}
function getValue(node) {
	return node.localName == "select" || node.type == "number"
		? +node.value
		: node.type == "checkbox"
			? node.checked
			: node.value;
}
function setValue(node, val) {
	if(node.type == "checkbox")
		node.checked = val;
	else
		node.value = val;
}
function $(id) {
	return document.getElementById(id);
}

init();