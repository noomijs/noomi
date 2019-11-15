import { NCache } from "../tools/ncache";
import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";
/**
 * web 缓存类
 */
declare class WebCache {
    static cache: NCache;
    static maxAge: number;
    static isPublic: boolean;
    static isPrivate: boolean;
    static noCache: boolean;
    static noStore: boolean;
    static mustRevalidation: boolean;
    static proxyRevalidation: boolean;
    static expires: number;
    static fileTypes: Array<string>;
    /**
     * 初始化
     */
    static init(cfg: any): Promise<void>;
    /**
     * 添加资源
     * @param url   url 请求url
     * @param path  url对应路径
     * @param data  path对应数据
     */
    static add(url: string, path: string, data: any, response?: HttpResponse): Promise<void>;
    /**
     * 加载资源
     * @param request   request
     * @param response  response
     * @param url       url
     * @return          0不用回写数据 或 数据
     */
    static load(request: HttpRequest, response: HttpResponse, url: string): Promise<any>;
    /**
     * 写cache到客户端
     * @param response          httpresponse
     * @param etag              etag
     * @param lastModified      lasmodified
     */
    static writeCacheToClient(response: HttpResponse, etag: string, lastModified: string): void;
    /**
     * 资源check，如果需要更改，则从服务器获取
     * @param request
     * @return          0从浏览器获取 1已更新 2资源不在缓存
     */
    static check(request: HttpRequest, url: string): Promise<number>;
}
export { WebCache };
