/// <reference types="node" />
import { ServerResponse, IncomingMessage } from "http";
import { HttpCookie } from "./httpcookie";
interface WriteCfg {
    data?: any;
    charset?: string;
    type?: string;
    statusCode?: number;
    crossDomain?: boolean;
}
export declare class HttpResponse extends ServerResponse {
    srcRes: ServerResponse;
    request: IncomingMessage;
    cookie: HttpCookie;
    init(req: any, res: any): void;
    /**
     * 回写到浏览器端
     * @param data          待写数据
     * @param charset       字符集
     * @param type          数据类型
     * @param crossDomain   跨域
     */
    writeToClient(config: WriteCfg): void;
    /**
     * 写header
     * @param key
     * @param value
     */
    setHeader(key: string, value: any): void;
    /**
     * 回写文件到浏览器端
     * @param file          待写文件
     * @param charset       字符集
     * @param type          数据类型
     * @param crossDomain   跨域
     */
    writeFileToClient(config: any): Promise<number>;
    /**
     * 重定向
     * @param response
     * @param page          跳转路径
     */
    redirect(page: string): void;
    /**
     * 写cookie到头部
     */
    writeCookie(): string;
}
export {};
