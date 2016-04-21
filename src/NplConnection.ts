/*
Title: npl connection
Author:leio
Date:2016/4/18
Desc:
*/
import * as http from 'http';

import {EventEmitter} from 'events';
import * as Utils from './Utils';
import * as Logger from './Logger';
export class NplConnection{
    private mIp:string;
    private mPort:string;
    private mStatus:string = "";
    private mPollTimer:number;
    constructor(ip="localhost",port="8099"){
        this.mIp = ip;
        this.mPort = port;
    }
    public get status():string { return this.mStatus; }
    public set status(v:string){ this.mStatus = v; }
    
    private getUrl(url:string):string{
        url = `http://${this.mIp}:${this.mPort}/${url}`;
        return url;
    }
    private load(url:string):Promise<string>{
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
    
    private uploadBreakpoints():void{
        
    }
    public attach():void{
        let url = this.getUrl("ajax/vscode_debugger?action=attach");
        this.load(url).then(response => {
            //const data = JSON.parse(response);
            Logger.log("received:" + response);
            this.uploadBreakpoints();    
        })
        //this.startTimer();
    }
    public pause():void{
        let url = this.getUrl("ajax/vscode_debugger?action=pause");
        this.load(url).then(response => {
            this.uploadBreakpoints();    
        })
        this.startTimer();
    }
    public stepinto():void{
        let url = this.getUrl("ajax/vscode_debugger?action=stepinto");
        this.load(url).then(response => {
        })
    }
     public stepout():void{
        let url = this.getUrl("ajax/vscode_debugger?action=stepout");
        this.load(url).then(response => {
        })
    }
     public stop():void{
        let url = this.getUrl("ajax/vscode_debugger?action=stop");
        this.load(url).then(response => {
        })
        this.stopTimer();
    }
    public continue():void{
        let url = this.getUrl("ajax/vscode_debugger?action=continue");
        this.load(url).then(response => {
        })
        this.status = "running";
    }
    public listBreakpoint():void{
        let url = this.getUrl("ajax/vscode_debugger?action=listbreakpoint");
        this.load(url).then(response => {
        })
    }
    public getBreakpointIndex(filename:string,line:number):number{
        return -1;
    }
    public addBreakpoint(filename:string,line:number):void{
    }
    public removeBreakpoint(filename:string,line:number):void{
    }
    private startTimer():void{
        if(this.mPollTimer){
            return;
        }
        this.mPollTimer = setInterval(()=>{
            let url = this.getUrl("ajax/vscode_debugger?action=poll_msg");
            this.load(url).then(response => {
                const data = JSON.parse(response);
                this.handleMessage(data);
            })
        },500);
    }
    private stopTimer():void{
        if(this.mPollTimer){
            clearInterval(this.mPollTimer);
            this.mPollTimer = null;
        }
        this.status = "detached";
    }
    private handleMessage(data:any):void{
        
    }
}