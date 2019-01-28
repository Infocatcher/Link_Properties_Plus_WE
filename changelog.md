#### Link Properties Plus WE: Changelog

`+` – added<br>
`-` – deleted<br>
`x` – fixed<br>
`*` – improved<br>

##### master/HEAD
`x` Correctly stop wait for browser.webRequest.onSendHeaders in case of blocked request.<br>
`+` Added support for selected text links (Firefox 60+).<br>

##### 2.0b2 (2019-01-26)
`*` Updated hotkey validation: mark as invalid only if browser.commands.update() failed.<br>
`+` Added ability to close tab/window using Esc key.<br>
`x` Workaround to show request headers in case of browser.webRequest.onSendHeaders notification after server response.<br>

##### 2.0b1 (2019-01-05)
`+` Added ability to configure hotkey.<br>
`*` Don't use `__MSG_…__` localization key in window title: was visible as is at startup.<br>
`+` Added update notice: WE API restrictions + link to classic version.<br>
`*` Now used ID of Link Properties Plus (+ bump version to 2.0b1 to update from Link Properties Plus).<br>

##### 0.1a2 (2018-04-06)
`+` Added locales from original Link Properties Plus.<br>
`+` Added options to hide output items.<br>
`*` Automatically prepend “http://” to URLs without protocol.<br>
`x` Correctly detect redirects like HSTS.<br>
`x` Correctly show direct link for URLs with #hash.<br>
`x` Correctly encode referers with Unicode characters.<br>
`*` Apply options around output formatting on the fly.<br>
`+` Added links to open and download initial and direct links.<br>
`*` Tweak styles.<br>
`x` Fixes for disabled multi-process mode.<br>
`*` Activate already opened properties tab/window (don't open for the same URL and referer twice).<br>
`x` Correctly pass referer from context menu in Firefox 60+.<br>
`*` Open private properties windows from private tabs.<br>
`+` Added option to restore window position (movement is visible due to API limitations).<br>
`*` Changed (inverted) option: “open in tab” → “open in window”.<br>
`+` Added Alt+Shift+L hotkey to open properties.<br>

##### 0.1a1 (2018-01-15)
`*` First WebExtensions draft.<br>