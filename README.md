###how to generate/publish/install a new extension
* generate a new extension
npm install -g yo generator-code
yo code
* publish a new extension
npm install -g vsce 
vsce package
details in https://code.visualstudio.com/docs/tools/vscecli
* install a packaged extension(.vsix)
code myExtensionFolder\nplruntime.vsix
details in https://code.visualstudio.com/docs/extensions/install-extension
