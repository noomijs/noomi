import {App} from "../tools/application";
import {Util} from "../tools/util";

/**
 * form 参数处理器
 */
export class PostFormHandler {
    /**
     * 分隔符
     */
    private boundary: Buffer;
    /**
     * 换行符
     */
    private lineBreak: string;
    /**
     * 文件存储路径
     */
    private saveDir: string;
    /**
     * 属性名
     */
    private propName: string;
    /**
     * 开始读数据值
     */
    private valueStarted: boolean;
    /**
     * 当前帧
     */
    private buf: Buffer;
    /**
     * 值
     */
    private value: unknown;
    /**
     * 返回对象
     */
    private returnObj: object;
    /**
     * 当前属性为文件类型
     */
    private isFile: boolean;

    /**
     * @param boundary -      属性分隔符
     * @param tmpDir -        文件临时存储路径
     */
    constructor(boundary: string, tmpDir: string) {
        if (boundary) {
            this.boundary = Buffer.from('--' + boundary);
        }
        this.saveDir = tmpDir;
        this.returnObj = {};
    }

    /**
     * 处理buf
     * @param buf -  新缓冲区
     */
    public handleBuf(buf: Buffer) {
        // 获取换行符，首次执行时处理
        this.getLineBreak(buf);
        let buf1 = this.buf ? Buffer.concat([this.buf, buf]) : buf;
        let ind: number = buf1.indexOf(this.boundary);
        if (ind !== -1) { // 有分隔符
            // 循环处理所有数据项
            while ((ind = buf1.indexOf(this.boundary)) !== -1) {
                if (this.valueStarted) { // 上一帧值已经开始，尚未传完
                    const buf2 = buf1.subarray(0, ind - this.lineBreak.length);
                    if (this.isFile) {    // 文件
                        if (this.value['fileName']) {
                            App.fs.writeFileSync(this.value['path'], buf2, {flag: 'a+'});
                        }
                    } else { // 普通串
                        this.value = (this.value ? Buffer.concat([<Buffer>this.value, buf2]) : buf2).toString();
                    }
                    // 属性值绑定到属性名，如果属性名已存在，则作为数组
                    if (this.returnObj.hasOwnProperty(this.propName)) {
                        // 新建数组
                        if (!Array.isArray(this.returnObj[this.propName])) {
                            this.returnObj[this.propName] = [this.returnObj[this.propName]];
                        }
                        // 把新值加入数组
                        this.returnObj[this.propName].push(this.value);
                    } else {
                        this.returnObj[this.propName] = this.value;
                    }
                    // 处理完当前属性，参数还原
                    this.propName = undefined;
                    this.value = undefined;
                    this.valueStarted = undefined;
                    this.isFile = undefined;
                    this.buf = buf1.subarray(ind + this.boundary.length + this.lineBreak.length);
                } else if (ind === 0) {    // 最开始为分隔符，直接去掉分隔符
                    this.buf = buf1.subarray(ind + this.boundary.length + this.lineBreak.length);
                } else { // 上一帧无法构成完整数据项
                    this.buf = buf1;
                }
                // 取属性
                this.handleNewProp();
                // 更新buf1
                buf1 = this.buf;
            }
        } else if (this.valueStarted) { // 无分隔符，值已开始，尚未结束
            if (this.isFile) { // 文件
                if (this.buf && this.value['fileName']) {
                    // 直接把当前buf写文件
                    App.fs.writeFileSync(this.value['path'], this.buf, {flag: 'a+'});
                }
                // 保留当前帧，可能需要和下一帧进行合并为有效数据项
                this.buf = buf;
            } else { // 不是文件，添加到buf，可能需要和下一帧合并为有效数据项
                this.buf = buf1;
            }
        } else {  // 无分隔符，值未开始，数据项信息不完整
            this.buf = buf1;
        }
    }

    /**
     * 获取换行符
     * @param buf -   来源buffer
     * @returns
     */
    private getLineBreak(buf: Buffer) {
        if (this.lineBreak) {
            return;
        }
        this.lineBreak = buf.indexOf('\r\n') === -1 ? '\n' : '\r\n';
        let buf1 = buf;
        while (!this.boundary && buf1.length > 0) {
            const ind = buf1.indexOf(this.lineBreak);
            if (ind === -1) {
                return;
            }
            const buf2 = buf1.subarray(0, ind);
            const line = buf2.toString().trim();
            if (line.startsWith('--')) {
                this.boundary = Buffer.from(line);
                break;
            }
            buf1 = buf1.subarray(ind + this.lineBreak.length);
        }
    }

    /**
     * 从buffer读一行
     * @param buf -   buf
     * @returns     行字符串
     */
    private readLine(): string {
        if (!this.buf || this.buf.length === 0) {
            return null;
        }
        const index = this.buf.indexOf(this.lineBreak);
        if (index === -1) {
            return null;
        }
        const r = this.buf.subarray(0, index).toString();
        this.buf = this.buf.subarray(index + this.lineBreak.length);
        return r;
    }

    /**
     * 处理新属性
     * 包括属性名、文件类型，值前的空行
     */
    private handleNewProp() {
        if (this.valueStarted) {
            return;
        }
        // 取属性
        if (this.buf.length > 0 && !this.propName) {
            this.handleProp();
        }
        if (this.value && this.value['fileName']) {
            if (this.buf.length > 0 && !this.value['fileType']) {
                this.handleFileType();
            }
            if (this.value['fileType']) {
                let r;
                while ((r = this.readLine()) !== null) {
                    if (r === '') {
                        this.valueStarted = true;
                        break;
                    }
                }
            }
        } else if (this.readLine() !== null) {
            this.valueStarted = true;
        }
    }

    /**
     * 处理文件类型
     */
    private handleFileType() {
        const line = this.readLine();
        if (!line || line === '') {
            return;
        }
        this.value['fileType'] = line.substring(line.indexOf(':') + 1).trim();
    }

    /**
     * 处理属性名
     */
    private handleProp() {
        let line;
        // 空行不处理
        while ((line = this.readLine()) === '' && line) ;
        // 无行可读
        if (!line) {
            return;
        }
        const arr = line.split(';');
        // 数据项名
        const pn = arr[1].substring(arr[1].indexOf('=')).trim();
        this.propName = pn.substring(2, pn.length - 1);
        if (arr.length > 2) {  // 文件
            for (let i = 2; i < arr.length; i++) {
                const s = arr[i].trim();
                if (s.startsWith('filename=')) {
                    this.isFile = true;
                    const a1 = s.split('=');
                    // 文件名为空，此项不存
                    if (a1[1] == '""') {
                        this.value = {};
                        return;
                    }
                    const fn = a1[1];
                    const fn1 = fn.substring(1, fn.length - 1).trim();
                    const fn2 = App.uuid.v1() + fn1.substring(fn1.lastIndexOf('.'));
                    // 得到绝对路径
                    const filePath = Util.getAbsPath([this.saveDir, fn2]);
                    this.value = {
                        fileName: fn1,
                        path: filePath
                    };
                }
            }
        }
    }

    /**
     * 获取result
     * @returns     参数值对象
     */
    public getResult() {
        return this.returnObj;
    }
}