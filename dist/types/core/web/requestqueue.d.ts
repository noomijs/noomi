import { HttpRequest } from "./httprequest";
/**
 * request 队列
 */
interface RequestItem {
    req: HttpRequest;
    expire?: number;
}
declare class RequestQueue {
    static queue: Array<RequestItem>;
    static canHandle: boolean;
    /**
     * 加入队列
     * @param req
     * @param res
     */
    static add(req: HttpRequest): void;
    /**
     * 处理队列
     */
    static handle(): void;
    /**
     * 资源访问
     * @param request   request
     * @param path      url路径
     */
    static handleOne(request: HttpRequest): void;
    /**
     * 设置允许处理标志
     * @param v
     */
    static setCanHandle(v: boolean): void;
}
export { RequestQueue };
