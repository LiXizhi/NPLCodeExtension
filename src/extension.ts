'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {exec} from 'child_process';

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

//import {ipcMain as ipc, app, screen, crashReporter, BrowserWindow, dialog} from 'electron';
let paracraft_url = "http://www.nplproject.com/download/paracraft/latest/ParacraftLauncher.exe";
let paracraft_runtime_dir:string;
let paracraft_exe:string;
function doStart()
{
    vscode.window.setStatusBarMessage("paracraft_exe:" + paracraft_exe);
    if (fs.existsSync(paracraft_exe))
    {
        let cmd ="CALL " + "\"" + paracraft_exe+ "\""; 
        exec(cmd);
        return true;
    }
    return false;
}
function start(){
    if (!doStart()) {
        update();
    }
}
function update(){
       
        if (!fs.existsSync(paracraft_runtime_dir)) {
            fs.mkdirSync(paracraft_runtime_dir)
        }
        var request = http.get(paracraft_url, function(response) {
            console.log('response.statusCode:' + response.statusCode);
            var len = parseInt(response.headers['content-length'], 10);
            var cur = 0;
            var total = len / 1048576; //1048576 - bytes in  1Megabyte
            var file = fs.createWriteStream(paracraft_exe);
            var data = [];
            
            response.on("data",function(chunk)
            {
                data.push(chunk);
                cur += chunk.length;
                var log = "Downloading " + (100.0 * cur / len).toFixed(2) + "% " + (cur / 1048576).toFixed(2) + " MB." + "Total size: " + total.toFixed(2) + " MB";
                vscode.window.setStatusBarMessage(log);
            });
            response.on("end",function()
            {
                var binary = Buffer.concat(data);
                file.write(binary);
                file.end();
                vscode.window.setStatusBarMessage("");
            });
            request.on("error", function(e){
                vscode.window.setStatusBarMessage("Error: " + e.message);
            });
            
        });
}
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    
    console.log("nplextension is now active!");
    paracraft_runtime_dir = get_root() + "/nplruntime";
    paracraft_exe = paracraft_runtime_dir + "/ParacraftLauncher.exe";
    let start_cmd = vscode.commands.registerCommand('npl.start', () => {
        start();
    });
    let update_cmd = vscode.commands.registerCommand('npl.update', () => {
        update();
    });
    let test_cmd = vscode.commands.registerCommand('npl.test', () => {
        test();
    });
    context.subscriptions.push(start_cmd,update_cmd,test_cmd);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
function get_root() {
    let root = process.cwd();
    return path.resolve(root);    
}
function test() {
    //let win = new BrowserWindow();
    vscode.window.setStatusBarMessage("root: " + get_root());
}