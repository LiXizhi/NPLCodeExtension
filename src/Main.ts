'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {exec} from 'child_process';

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
let paracraft_url = "http://www.nplproject.com/download/paracraft/latest/ParacraftLauncher.exe";
let paracraft_runtime_dir:string;
let paracraft_exe:string;

//debugger
import NplConnection = require("./NplConnection");
import Logger = require("./Logger");
let nplConn = new NplConnection.NplConnection();
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
    Logger.log("nplextension is now active!");
    paracraft_runtime_dir = get_root() + "/nplruntime";
    paracraft_exe = paracraft_runtime_dir + "/ParacraftLauncher.exe";
    let start_cmd = vscode.commands.registerCommand('npl.start', () => {
        start();
    });
    let update_cmd = vscode.commands.registerCommand('npl.update', () => {
        update();
    });
    let run_cmd = vscode.commands.registerCommand('npl.run', () => {
        run();
    });
    let test_cmd = vscode.commands.registerCommand('npl.test', () => {
        test();
    });
    let attach_cmd = vscode.commands.registerCommand('npldebugger.attach', () => {
        nplConn.attach();
    });
     
    context.subscriptions.push(start_cmd,update_cmd,run_cmd,test_cmd,attach_cmd);
}

// this method is called when your extension is deactivated
export function deactivate() {
}
function get_root() {
    let root = process.cwd();
    return path.resolve(root);    
}
function run() {
    let arr = [0,1,2,3];
    let a = arr.slice();
    a[0] = 10;
    console.log(arr);
    
}
function get_runtime_folder() {
    return get_root() + "/nplruntime";
}
function test() {
    let config = readNPLConfig();
    let rootPath = vscode.workspace.rootPath;
    let main_file = config.main;
    if(!main_file) main_file = "./main.lua";
    let client_path = get_root() + "/nplruntime/ParaEngineClient.exe";
    let cmdline = getCmdLine(main_file);
    let cmd = client_path + " " + cmdline; 
    console.log(cmd);
    exec(cmd);
    vscode.window.setStatusBarMessage(cmd);
}
function getCmdLine(main_file:string) {
    let rootPath = vscode.workspace.rootPath;
    let s = "bootstrapper=\"" + main_file + "\" single=\"false\" mc=\"true\" noupdate=\"true\" dev=\"" + rootPath + "\"";
    return s;     
}
function readNPLConfig(name = "nplconfig.json") {
    let rootPath = vscode.workspace.rootPath;
    name = rootPath + "/" + name;
    let config = null;
    if( fs.existsSync(name) && fs.lstatSync(name).isFile()){
        config = JSON.parse(fs.readFileSync(name,"utf8"));
    }else{
        config = {"main":"./main.lua"};
    }
    return config;
}

function loadURL(url:string):Promise<string>{
        return new Promise((resolse,reject)=>{
            Logger.log("load url:" + url);
            http.get(url,response=>{
                let responseData = "";
                response.on("data",chunk => responseData += chunk);
                response.on("end",() =>{
                    if(response.statusCode == 200){
                        resolse(responseData);
                    }else{
                        Logger.log("http get failed with: " + response.statusCode.toString() + " " + response.statusMessage.toString());
                        reject(responseData);
                    }
                });
                
            }).on("error", e => {
                Logger.log("load url error: " + e);
                reject(e);
            });
        });
    }