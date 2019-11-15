"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webconfig_1 = require("./webconfig");
const routefactory_1 = require("../main/route/routefactory");
const filterfactory_1 = require("./filterfactory");
const staticresource_1 = require("./staticresource");
const application_1 = require("../tools/application");
class RequestQueue {
    /**
     * 加入队列
     * @param req
     * @param res
     */
    static add(req) {
        let timeout = webconfig_1.WebConfig.get('request_timeout') || 0;
        this.queue.push({
            req: req,
            expire: timeout > 0 ? new Date().getTime() + timeout * 1000 : 0
        });
        if (this.canHandle) {
            this.handle();
        }
    }
    /**
     * 处理队列
     */
    static handle() {
        //队列轮询
        if (this.queue.length === 0) {
            return;
        }
        //cpu超限，延迟1m执行队列
        if (!this.canHandle) {
            this.canHandle = true;
            setTimeout(() => {
                RequestQueue.handle();
            }, 1000);
            return;
        }
        let item = this.queue.shift();
        if (item.expire === 0 || item.expire > new Date().getTime()) {
            this.handleOne(item.req);
        }
        this.handle();
    }
    /**
     * 资源访问
     * @param request   request
     * @param path      url路径
     */
    static handleOne(request) {
        let path = application_1.App.url.parse(request.url).pathname;
        if (path === '') {
            return;
        }
        //获得路由，可能没有，则归属于静态资源
        let route = routefactory_1.RouteFactory.getRoute(path);
        //路由资源
        if (route !== null) {
            //参数
            request.init().then((params) => {
                //过滤器执行
                filterfactory_1.FilterFactory.doChain(request.url, request, request.response).then((r) => {
                    if (r) {
                        //路由调用
                        routefactory_1.RouteFactory.handleRoute(route, params, request, request.response);
                    }
                });
            });
        }
        else { //静态资源
            staticresource_1.StaticResource.load(request, request.response, path);
        }
    }
    /**
     * 设置允许处理标志
     * @param v
     */
    static setCanHandle(v) {
        this.canHandle = v;
    }
}
exports.RequestQueue = RequestQueue;
RequestQueue.queue = [];
//可以处理标志
RequestQueue.canHandle = true;
//# sourceMappingURL=requestqueue.js.map