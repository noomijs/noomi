
import { NoomiError } from "../../tools/errorfactory";
import { HttpResponse } from "../../web/httpresponse";

/**
 * 路由异常处理类
 * 如果需要自定义输出，需要继承该类并重载handle方法
 * @since 0.3.7
 */
export class RouteErrorHandler{
    /**
     * 异常处理方法
     * @param res   http response
     * @param e     异常对象
     */
    handle(res:HttpResponse,e:Error){
        let msg = e;
        res.writeToClient({
            data:"<h1>" +  new NoomiError('2102') + "</h1><h3>Error Message:" + msg + "</h3>"
        });
    }
}