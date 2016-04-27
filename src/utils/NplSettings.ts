import * as vscode from 'vscode';
import * as fs from 'fs';
import * as Utils from "./Utils";
let mInstance = undefined;
export function instance():NplSettings{
    if(!mInstance){
        mInstance = new NplSettings();
        mInstance.load();
    }
    return mInstance;
}
export class NplSettings {
    private configName = "nplconfig.json";
    
    public paraengine_root:string = ".";
    public cmd:string = "paraengineclient.exe";
    public arguments:string = "mc=\"true\" bootstrapper=\"script/apps/Aries/main_loop.lua\" version=\"\" debug=\"true\"";
    public relative = true;
    private load():void{
        let rootPath = vscode.workspace.rootPath;
        let name = rootPath + "/" + this.configName;
        let config:Object = null;
        if( fs.existsSync(name) && fs.lstatSync(name).isFile()){
            config = JSON.parse(fs.readFileSync(name,"utf8"));
        }
        for(let key in config){
            this[key] = config[key];
        }
    }
    public get paraengineAbsolutePath():string{
        let rootPath = Utils.forceForwardSlashes(vscode.workspace.rootPath);
        let paraengine_root = Utils.forceForwardSlashes(this.paraengine_root);
        if(this.relative){
            return `${rootPath}/${paraengine_root}`;
        }else{
            return paraengine_root;
        }
    }
    public get runExeCmdline():string{
        return `${this.paraengineAbsolutePath}/${this.cmd} ${this.arguments}`;
    }
}