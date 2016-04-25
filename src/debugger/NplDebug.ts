/*
Title: run npl debug session
Author:leio
Date:2016/4/21
Desc:
*/
import { NplDebugSession } from "./NplDebugSession";
import { DebugSession } from 'vscode-debugadapter';

DebugSession.run(NplDebugSession);