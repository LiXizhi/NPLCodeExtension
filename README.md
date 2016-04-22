###how to generate/publish/install a new extension
* generate a new extension
```
npm install -g yo generator-code
yo code
```
* publish a new extension [details](https://code.visualstudio.com/docs/tools/vscecli)
```
npm install -g vsce
vsce package
```

* install a packaged extension(.vsix) [details](https://code.visualstudio.com/docs/extensions/install-extension)
```
code myExtensionFolder\nplruntime.vsix
```

