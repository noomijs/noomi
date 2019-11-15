import { HttpResponse } from "./httpresponse";
import { HttpRequest } from "./httprequest";
/**
 * 静态资源加载器
 */
declare class StaticResource {
    static forbiddenMap: Map<string, RegExp>;
    /**
     *
     * @param path      文件路径
     * @param request   request
     * @param response  response
     */
    static load(request: HttpRequest, response: HttpResponse, path: string): Promise<void>;
    /**
     * 添加静态路径
     * @param paths   待添加的目录或目录数组
     */
    static addPath(paths: any): void;
}
export { StaticResource };
