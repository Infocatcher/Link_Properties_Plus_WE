#### Link Properties Plus WE: Changelog

`+` – added<br>
`-` – deleted<br>
`x` – fixed<br>
`*` – improved<br>

##### master/HEAD
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