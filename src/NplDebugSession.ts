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
import {basename} from 'path';
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
    private static THREAD_ID = 1;
	private mBreakpointId = 1000;
    private mCommittedBreakpointsByUrl:Map<string,number[]>;
    private mClientAttached:boolean = false;
    private mHitBreakpointFile:string;
    private mHitBreakpointLine:number;
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
    private uploadBreakPoints(url:string,lines:number[]):Promise<void>{
        return  this.clearAllBreakpoints(url).then(()=>{
            return this.addBreakpoints(url,lines);
        });
    }
    private addBreakpoints(url:string,lines: number[]):Promise<void>{
        Logger.log("addBreakpoints:" + url);
        Logger.log("lines:" + lines);
        let temp_lines = lines.slice();
        return temp_lines.reduce((p,line)=>{
            return p.then(()=>{
                let s = this.getUrl("ajax/vscode_debugger?action=addbreakpoint&filename=" + encodeURIComponent(url) + "&line=" + encodeURIComponent(String(line)));
                Logger.log("addbreakpoint:" + s);
                return this.load(s).then((rsp)=>{
                    Logger.log("rsp addbreakpoint:" + rsp);
                });
            });
        },Promise.resolve()).then(()=>{
            Logger.log("addBreakpoints finished");
            this.mCommittedBreakpointsByUrl.set(url,lines);
        });
    }
    private clearAllBreakpoints(url: string):Promise<void>{
        let lines = this.mCommittedBreakpointsByUrl.get(url); 
        Logger.log("clearAllBreakpoints:" + url);
        Logger.log("lines:" + lines);
         if (!this.mCommittedBreakpointsByUrl.has(url)) {
            return Promise.resolve();
        }
        return this.mCommittedBreakpointsByUrl.get(url).reduce((p,line) =>{
            return p.then(() => {
                let s = this.getUrl("ajax/vscode_debugger?action=removebreakpoint&filename=" + encodeURIComponent(url) + "&line=" + encodeURIComponent(String(line)));
                Logger.log("clearAllBreakpoint:" + s);
                return this.load(s).then((rsp)=>{
                    Logger.log("clearAllBreakpoints received:" + rsp);
                });
            });
        }, Promise.resolve()).then(() => {
            Logger.log("clearAllBreakpoints finished");
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
                Logger.log("handleMessage:" + response);
                let result = JSON.parse(response);
                let msgs = result.msgs;
                for(var i in msgs){
                    this.handleMessage(msgs[i]);
                }
            })
        },500);
    }
    private stopTimer():void{
        if(this.mPollTimer){
            clearInterval(this.mPollTimer);
            this.mPollTimer = null;
        }
    }
    private handleMessage(msg:any):void{
        let cmd = msg.filename;
        Logger.log("cmd:" + cmd);
        if (cmd == "BP") {
            let stackinfo = msg.code.stack_info;
            let source = stackinfo[0].source;
            let currentline = stackinfo[0].currentline;
            Logger.log("source:" + source);
            Logger.log("currentline:" + currentline);
            this.mHitBreakpointFile = source;
            this.mHitBreakpointLine = currentline;
            this.sendEvent(new StoppedEvent("breakpoint",NplDebugSession.THREAD_ID));
            return;
        }
        else if (cmd == "ExpValue") {
        }
        else if (cmd == "DebuggerOutput" && msg.code != null) {
            if (msg.code == "[DEBUG]> ") {
            }
            else if (msg.code.substring(0, 10) == "Break at: ") {
                var lineEnd = msg.code.indexOf(" in");
                if (lineEnd > 0) {
                    var line = Number(msg.code.substr(10, lineEnd - 10));
                    var filename = msg.code.substr(lineEnd + 4, msg.code.length - lineEnd - 4).trim();
                    
                }
            }
        }
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
        if(this.mClientAttached){
            Logger.log("error:reduplicate attachRequest");
           return 
        }
        Logger.log(`attachRequest:${args.ip} ${args.port}`);
        
        this.mIp = args.ip;
        this.mPort = args.port;
        let s = this.getUrl("ajax/vscode_debugger?action=attach");
        this.load(s).then( rsp => {
            //TODO:one-by-one upload
            this.mCommittedBreakpointsByUrl.forEach((lines,url)=>{
                this.addBreakpoints(url,lines);                
            })
            Logger.log("attachRequest received:" + rsp);
            this.sendResponse(response);
            
            this.mClientAttached = true;
            this.startTimer();
            
        } );
    }
    protected disconnectRequest(response: DebugProtocol.DisconnectResponse, args: DebugProtocol.DisconnectArguments): void {
        let url = this.getUrl("ajax/vscode_debugger?action=stop");
        Logger.log("disconnectRequest url:" + url);
        this.load(url).then(rsp => {
            Logger.log("disconnectRequest received:" + rsp);
            this.sendResponse(response);
            this.mClientAttached = false;
            this.stopTimer();
        })
	}
    
    protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
        Logger.log("setBreakPointsRequest");
        let targetScriptUrl = args.source.path;
        let lines = [];
        args.breakpoints.forEach((breakpoint)=>{
            lines.push(breakpoint.line);
        })
        if(!this.mClientAttached){
            //record all of breakpoints before attachRequest
            this.mCommittedBreakpointsByUrl.set(targetScriptUrl,lines);
            return
        }        
        
        var breakpoints = new Array<Breakpoint>();
        
        this.uploadBreakPoints(targetScriptUrl,lines).then(()=>{
            lines.forEach((line)=>{
                const bp = <DebugProtocol.Breakpoint> new Breakpoint(false,line);
                bp.id = this.mBreakpointId++;
                breakpoints.push(bp);
                response.body = {
                    breakpoints: breakpoints
                };
            });
            this.sendResponse(response);
            Logger.log("setBreakPointsRequest finished");
        });
    }
    protected continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): void {
        let url = this.getUrl("ajax/vscode_debugger?action=continue");
        this.load(url).then(rsp => {
            this.sendResponse(response);
        })
    }
    protected nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): void {
        let url = this.getUrl("ajax/vscode_debugger?action=stepover");
        this.load(url).then(rsp => {
            this.sendResponse(response);
        })
    }
    protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		// return the default thread
		response.body = {
			threads: [
				new Thread(NplDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}
    /** Called by VS Code after a StoppedEvent */
    protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): void {
        Logger.log("stackTraceRequest");
		const frames = new Array<StackFrame>();
        //frames.push(new StackFrame(0,"frame name 111",new Source(basename(this.mHitBreakpointFile),this.convertDebuggerPathToClient(this.mHitBreakpointFile)), this.convertDebuggerLineToClient(this.mHitBreakpointLine), 0));
        frames.push(new StackFrame(0,"frame name 111",new Source(basename(this.mHitBreakpointFile),this.mHitBreakpointFile), this.mHitBreakpointLine, 0));
		response.body = {
			stackFrames: frames
		};
		this.sendResponse(response);
	}
}