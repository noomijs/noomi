import {HttpRequest} from "./httprequest";
import {WebConfig} from "./webconfig";
import {ERouteResultType, RouteInst} from "../types/routetypes";
import {FilterFactory} from "./filterfactory";
import {StaticResource} from "./staticresource";
import {App} from "../tools/application";
import {PageFactory} from "../tools/pagefactory";
import {HttpResponse} from "./httpresponse";
import {Util} from "../tools/util";
import {WebCache,} from "./webcache";
import {WebAfterHandler} from "./webafterhandler";
import {NoomiError} from "../tools/noomierror";
import { RouteFactory } from "../main/route/routefactory";
import { WebCacheItem } from "../types/webtypes";

/**
 * 请求队列
 */
//TODO v1.0.1 添加忙时延迟访问
export class RequestQueue {
    /**
     * 资源访问
     * @param request -   request
     */
    public static async handle(request: HttpRequest) {
        const response: HttpResponse = request.response;
        switch (request.method) {
            case 'OPTIONS':
                response.doOptions();
                return;
            case 'DELETE':
                response.writeToClient({
                    statusCode: 405
                });
                return;
            case 'PUT':
                response.writeToClient({
                    statusCode: 405
                });
                return;
            case 'PATCH':
                response.writeToClient({
                    statusCode: 405
                });
                return;
        }
        // gzip
        const zipStr: string = <string>request.getHeader("accept-encoding");
        const gzip: boolean = zipStr && zipStr.indexOf('gzip') !== -1 ? true : false;
        let path = App.url.parse(request.url).pathname;
        //路径解码
        try{
            path = decodeURI(path);
        }catch(e){}
        let data;
        // welcome页面
        if (path === '' || path === '/') {
            if (WebConfig.welcomePage) {
                path = WebConfig.welcomePage;
            }
        }
        // 前置过滤器执行
        if (!await FilterFactory.doChain(request.url, request, response)) {
            return;
        }
        // 从路由查找
        const route: RouteInst = RouteFactory.getRoute(path);
        if (route !== null) {
            // 执行
            try {
                data = await RouteFactory.handleRoute(route, request, response);
                // 重定向直接返回
                if (data === ERouteResultType.REDIRECT) {
                    return;
                }
            } catch (e) {
                // 如果非Error，需要转换为NoomiError
                if(!(e instanceof Error)){
                    e = new NoomiError(e);
                }
                data = e;
            }
        } else { // 静态资源
            // 从web cache获取数据
            data = await WebCache.load(request, response, path);
            if (!data) {
                // 加载静态数据
                data = await StaticResource.load(request, response, path, gzip);
            }
        }
        // 后置过滤器执行
        data = await WebAfterHandler.doChain(request.url, data, request, response);
        this.handleResult(response, data, path, gzip);
    }

    /**
     * 处理结果
     * @param response -  response对象
     * @param data -      数据或数据对象
     * @param path -      资源路径
     * @param isZip -     是否zip
     */
    private static handleResult(response: HttpResponse, data: object, path: string, isZip: boolean) {
        if (!data) {
            return;
        }
        if (typeof data === 'number') { //http 异常码
            if (data !== 0) {
                const page = PageFactory.getErrorPage(data);
                if (page && App.fs.existsSync(Util.getAbsPath([page]))) {
                    response.redirect(page);
                } else {
                    response.writeToClient({
                        statusCode: data
                    });
                }
            }
        } else if (typeof data === 'object') {
            const cData: WebCacheItem = <WebCacheItem>data;
            // json格式为utf8，zip和流用binary
            const charset = data['mimeType'] && data['mimeType'].indexOf('/json') === -1 || isZip && cData.zipData ? 'binary' : 'utf8';
            // 写web cache相关参数
            WebCache.writeCacheToClient(response, cData.etag, cData.lastModified);
            // 可能只缓存静态资源信息，所以需要判断数据
            if (isZip && cData.zipData) { // 压缩数据
                response.writeToClient({
                    data: cData.zipData,
                    type: cData.mimeType,
                    size: cData.zipSize,
                    zip: 'gzip',
                    charset: charset
                });
            } else if (cData.etag) {  // 文件
                response.writeFileToClient({
                    data: Util.getAbsPath([path]),
                    type: cData.mimeType,
                    size: cData.dataSize
                });
            } else if (cData.data) { // 数据
                response.writeToClient({
                    data: cData.data,
                    type: cData.mimeType,
                    size: cData.dataSize,
                    charset: charset
                });
            } else {  // 数据对象
                response.writeToClient({
                    data: cData.data,
                    charset: charset
                });
            }
        } else {  // 非对象
            response.writeToClient({
                data: data
            });
        }
    }
}