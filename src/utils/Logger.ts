import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

let mLogger:Logger;
export function log(msg:string):void{
    if(!mLogger){
        mLogger = new Logger();
    }
    mLogger.log(msg);
}
class Logger{
    private mLogFileStream: fs.WriteStream;
    constructor(){
        const logPath = path.resolve(__dirname, '../../vscode-npl-debug.txt');
        this.mLogFileStream = fs.createWriteStream(logPath);
        this.mLogFileStream.on('error', e => {
            this.log(`Error involving log file at path: ${logPath}. Error: ${e.toString()}`);
        });
    }
    public log(msg:string){
        if(console.log){
            console.log(msg + '\n');
        }
        if (this.mLogFileStream) {
            this.mLogFileStream.write(msg + '\n');
        }
    }
}