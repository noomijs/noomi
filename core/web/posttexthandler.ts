import { IncomingMessage} from "http";
import { App } from "../tools/application";
import { Util } from "../tools/util";
/**
 * 针对post不同mime进行处理
 */
 export class PostTextHandler{
    private mimeType:any;
    private buf:Buffer;
    constructor(contentTypeObj:any){
        this.mimeType = contentTypeObj;
        this.buf = Buffer.from('')
    }

    /**
     * 处理buf
     * @param buf  新缓冲区
     */
    public handleBuf(buf:Buffer){
        this.buf = Buffer.concat([this.buf,buf]);
    }

    /**
     * 获取result
     * @returns     文本串/json对象
     */
    public getResult():any{
        if(!this.buf || this.buf.length === 0){
            return;
        }
        let charset = this.mimeType.charset || 'utf8';
        let s = this.buf.toString(charset);
        if(this.mimeType.type === 'application/x-www-form-urlencoded'){ //urlencode
            s = decodeURIComponent(s);
            return App.qs.parse(s);
        }
        if(this.mimeType.type === 'application/json'){ // json
            return JSON.parse(s);
        }
        return {data:s};
    }
}