/*
Title: Npl debug session
Author:leio
Date:2016/4/21
Desc:
*/
"use strict";
import {
	DebugSession,
	InitializedEvent, TerminatedEvent, StoppedEvent, BreakpointEvent, OutputEvent, Event,
	Thread, StackFrame, Scope, Source, Handles, Breakpoint
} from 'vscode-debugadapter';
import {DebugProtocol} from 'vscode-debugprotocol';
import * as http from "http";
import * as Utils from "./Utils";
import * as Logger from "./Logger";
export interface AttachRequestArguments extends DebugProtocol.AttachRequestArguments{
    ip:string,
    port:string
}
/*
request commands
    initialize
    launch
    attach
    disconnect
    setBreakpoints
    setFunctionBreakpoints
    setExceptionBreakpoints
    configurationDone
    continue
    next
    stepIn
    stepOut
    pause
    stackTrace
    scopes
    variables
    source
    threads
    evaluate
*/
export class NplDebugSession extends DebugSession{
    private mIp:string;
    private mPort:string;
    private mPollTimer:number;
    private mSourceLines = new Array<string>();
	private mBreakPoints = new Map<string, DebugProtocol.Breakpoint[]>();
    // since we want to send breakpoint events, we will assign an id to every event
	// so that the frontend can match events with breakpoints.
	private mBreakpointId = 1000;
    private mCommittedBreakpointsByUrl:Map<string,number[]>;
    private mClientAttached:boolean = false;
    public constructor(){
        super();
    }
    private init():void{
        this.mClientAttached = false;
        this.mCommittedBreakpointsByUrl = new Map<string,number[]>();
    }
    private clearEverything():void{
        this.mClientAttached = false;
        this.mCommittedBreakpointsByUrl.clear();
    }
    private addBreakpoints(url:string,lines: number[]){
        let p = Promise.resolve("hello"); 
        lines.forEach((line)=>{
            p.then((rsp)=>{
                Logger.log("pre addbreakpoint:" + rsp);
                let s = this.getUrl("ajax/vscode_debugger?action=addbreakpoint&filename=" + encodeURIComponent(url) + "&line=" + encodeURIComponent(String(line)));
                Logger.log("addbreakpoint:" + s);
                p = this.load(url);
            }
            );
        });
    }
    private clearAllBreakpoints(url: string):Promise<void>{
         if (!this.mCommittedBreakpointsByUrl.has(url)) {
            return Promise.resolve();
        }
        return this.mCommittedBreakpointsByUrl.get(url).reduce((p,line) =>{
            return p.then(() => {
                let s = "ajax/debugger?action=removebreakpoint&filename=" + encodeURIComponent(url) + "&line=" + encodeURIComponent(String(line));
                this.load(url).then(()=>{});
            }).then(()=>{});
        }, Promise.resolve()).then(() => {
            this.mCommittedBreakpointsByUrl.set(url, null);
        });
    }
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
    }
    private handleMessage(data:any):void{
        
    }
    /**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
        Logger.log("initializeRequest");
        this.init();
		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());

		// This debug adapter implements the configurationDoneRequest.
		response.body.supportsConfigurationDoneRequest = true;

		// make VS Code to use 'evaluate' when hovering over source
		response.body.supportsEvaluateForHovers = true;

		this.sendResponse(response);
	}
    protected launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments): void {
    }
    protected attachRequest(response: DebugProtocol.AttachResponse, args: AttachRequestArguments): void {
        Logger.log(`attachRequest:${args.ip} ${args.port}`);
        this.mIp = args.ip;
        this.mPort = args.port;
        let url = this.getUrl("ajax/vscode_debugger?action=attach");
        this.load(url).then( rsp => {
            Logger.log("attachRequest received:" + rsp);
            this.sendResponse(response);
        } );
        //this.startTimer();
    }
    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        let url = this.getUrl("ajax/vscode_debugger?action=stop");
        Logger.log("disconnectRequest url:" + url);
        this.load(url).then(rsp => {
            Logger.log("disconnectRequest received:" + rsp);
            this.sendResponse(response);
        })
        //this.stopTimer();
	}
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
        Logger.log("setBreakPointsRequest:");
        let url = args.source.path;
        let lines = [];
        args.breakpoints.forEach((breakpoint)=>{
            lines.push(breakpoint.line);
        })
        Logger.log("url:" + url);
        Logger.log("lines:" + lines);
        
        this.addBreakpoints(url,lines);
        this.mCommittedBreakpointsByUrl.set(url,lines);
        
        this.sendResponse(response);
        // let filename:string = args.source.path;
        // let line:number = args.lines[0];
        
        // var breakpoints = new Array<Breakpoint>();
        // const bp = <DebugProtocol.Breakpoint> new Breakpoint(false,line);
        // bp.id = this.mBreakpointId++;
        // breakpoints.push(bp);
        // this.mBreakPoints.set(filename, breakpoints);
        // let url = this.getUrl("ajax/vscode_debugger?action=addbreakpoint&filename=" + encodeURIComponent(filename) + "&line=" + encodeURIComponent(String(line)));
        // this.load(url).then(rsp => {
        //     // send back the actual breakpoint positions
        //     response.body = {
        //         breakpoints: breakpoints
        //     };
		//     this.sendResponse(response);
        // });
    }
}