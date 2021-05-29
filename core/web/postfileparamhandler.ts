import { IncomingMessage} from "http";
import { App } from "../tools/application";
import { Util } from "../tools/util";
/**
 * 针对post不同mime进行处理
 */
 export class PostFileHandler{
    private saveDir:string
    public returnObj:any;
    private path:string;
    constructor(tmpDir:string,mimeType:string){
        this.saveDir = tmpDir;
        let type = App.mime.getExtension(mimeType);
        let fn2 = App.uuid.v1() + (type?'.'+type:'');
        //得到绝对路径
        this.path = Util.getAbsPath([this.saveDir,fn2]);
    }

    /**
     * 处理buf
     * @param buf  新缓冲区
     */
    public handleBuf(buf:Buffer){
        App.fs.writeFileSync(this.path,buf,{flag:'a+'});
    }

    /**
     * 获取result
     * @returns     {path:保存路径}
     */
    public getResult(){
        return  {path:this.path};
    }
}