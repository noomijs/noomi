import {App} from "../tools/application";
import {Util} from "../tools/util";

/**
 * 针对post不同mime进行处理
 */
export class PostFileHandler {
    /**
     * 文件保存目录
     */
    private saveDir: string
    /**
     * 返回对象
     */
    public returnObj: object;
    /**
     * 文件绝对路径
     */
    private path: string;

    constructor(tmpDir: string, mimeType: string) {
        this.saveDir = tmpDir;
        const type = App.mime.getExtension(mimeType);
        const fn2 = App.uuid.v1() + (type ? '.' + type : '');
        // 得到绝对路径
        this.path = Util.getAbsPath([this.saveDir, fn2]);
    }

    /**
     * 处理buf
     * @param buf -  新缓冲区
     */
    public handleBuf(buf: Buffer) {
        App.fs.writeFileSync(this.path, buf, {flag: 'a+'});
    }

    /**
     * 获取result
     * @returns     路径对象
     */
    public getResult():{path:string} {
        return {path: this.path};
    }
}