/// <reference types="node" />
import { IncomingMessage, ServerResponse } from "http";
import { Session } from "./sessionfactory";
import { HttpResponse } from "./httpresponse";
declare class HttpRequest extends IncomingMessage {
    srcReq: IncomingMessage;
    response: HttpResponse;
    parameters: any;
    constructor(req: IncomingMessage, res: ServerResponse);
    /**
     * 初始化
     * @return     promise 请求参数
     */
    init(): Promise<any>;
    /**
     * 获取header信息
     * @param key       header参数 name
     */
    getHeader(key: string): any;
    /**
     * 获取请求方法
     */
    getMethod(): string;
    /**
     * 获取来源url路径
     */
    getUrl(): string;
    /**
     * 设置参数
     * @param name      参数名
     * @param value     参数值
     */
    setParameter(name: string, value: string): void;
    /**
     * 获取参数
     * @param name      参数名
     * @return          参数值
     */
    getParameter(name: string): any;
    /**
     * 获取所有paramter
     * @return          parameter object
     */
    getAllParameter(): any;
    /**
     * 初始化url查询串
     */
    initQueryString(): void;
    /**
     * 获取session
     * @param request   httprequest
     * @return          session
     */
    getSession(): Promise<Session>;
    /**
     * 处理输入流
     * @param stream
     */
    formHandle(req: IncomingMessage): Promise<any>;
}
export { HttpRequest };
