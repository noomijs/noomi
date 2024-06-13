import {App} from "../tools/application";
import { ContentTypeOption } from "../types/webtypes";

/**
 * 针对post不同mime进行处理
 */
export class PostTextHandler {
    /**
     * mime类型
     */
    private mimeType: ContentTypeOption;
    /**
     * buffer流
     */
    private buf: Buffer;

    /**
     * 初始化mimeType和buf
     * @param contentTypeObj - contentType对象
     */
    constructor(contentTypeObj: ContentTypeOption) {
        this.mimeType = contentTypeObj;
        this.buf = Buffer.from('')
    }

    /**
     * 处理buf
     * @param buf -  新缓冲区
     */
    public handleBuf(buf: Buffer) {
        this.buf = Buffer.concat([this.buf, buf]);
    }

    /**
     * 获取result
     * @returns     文本串/json对象
     */
    public getResult(): object {
        if (!this.buf || this.buf.length === 0) {
            return;
        }
        const charset = this.mimeType.charset || 'utf8';
        let bufStr = this.buf.toString(<BufferEncoding>charset);
        if (this.mimeType.type === 'application/x-www-form-urlencoded') { //urlencode
            bufStr = decodeURIComponent(bufStr);
            return App.qs.parse(bufStr);
        }
        if (this.mimeType.type === 'application/json') { // json
            return JSON.parse(bufStr);
        }
        return {data: bufStr};
    }
}