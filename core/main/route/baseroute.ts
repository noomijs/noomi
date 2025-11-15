import {HttpRequest} from "../../web/httprequest";
import {HttpResponse} from "../../web/httpresponse";
import { ModelManager } from "../../tools/modelmanager";
import { NoomiError } from "../../tools/noomierror";

/**
 * 路由基类
 * @remarks
 * 可自动为路由类生成model(存放http请求参数的对象)，自带request和response对象，建议所有路由继承此基类
 * 
 * @public
 */
export class BaseRoute {
    /**
     * 数据对象
     */
    public model: any;
    /**
     * request对象
     */
    public request: HttpRequest;
    /**
     * response对象
     */
    public response: HttpResponse;

    /**
     * model设置
     * @remarks
     * 操作包含：
     * 
     * 1. 数据类型转换
     * 
     * 2. 数据校验
     * 
     * 如果类型转换或数据校验未通过，抛出异常
     * @param data -        数据对象(由浏览器/客户端传入的数据参数)
     * @param methodName -  路由方法名
     * @returns             数据转换错误、校验错误 或 undefined
     * 
     * @internal
     */
    public __setModel(data: object, methodName?: string):object {
        const mCls = this.constructor['__modelClass'];
        if (mCls) {
            //实例化model
            const m = Reflect.construct(mCls,[]);
            // model属性赋值
            Object.getOwnPropertyNames(data).forEach((item) => {
                m[item] = data[item];
            });
            const ctType: string = <string>this.request.getHeader('content-type');
            // 数据转换和校验，如果request content-type为application/json，则不进行转换
            if (!ctType || !ctType.startsWith('application/json')) {
                const r = ModelManager.handle(this,methodName,m);
                //如果不为空，抛出异常
                if (r) {
                    return new NoomiError(r);
                }
            }
            this.model = m;
        } else {
            this.model = data;
        }
    }
}