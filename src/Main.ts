'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {exec} from 'child_process';

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import NplSettings = require("./utils/NplSettings");
import Logger = require("./utils/Logger");
function start(){
    let cmdline = NplSettings.instance().runExeCmdline;
    let cmd ="CALL " +  cmdline;
    Logger.log(cmd);
    exec(cmd);
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    Logger.log("nplextension is now active!");
    let start_cmd = vscode.commands.registerCommand('npl.start', () => {
        start();
    });
    context.subscriptions.push(start_cmd);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

