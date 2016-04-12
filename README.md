-- how to generate a new extension
npm install -g yo generator-code
yo code

--how to package .vsix 
details in https://code.visualstudio.com/docs/tools/vscecli

--make sure vsce has installed
npm install -g vsce

--This will package your extension into a .vsix file and place it in the current directory
vsce package

--install a packaged extension(.vsix)
details in https://code.visualstudio.com/docs/extensions/install-extension

code myExtensionFolder\nplruntime.vsix


--npl commands
npl start:start npl runtime
npl update:update npl runtime
--run code commands
press f1
type npl start