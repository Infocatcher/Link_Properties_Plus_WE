var params = new URL(location).searchParams;
var url = params.get("url");

document.body.textContent = url;