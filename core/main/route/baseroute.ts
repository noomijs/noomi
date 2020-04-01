import { HttpRequest} from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
/**
 * 路由基类
 * 可自动为路由类生成model(传入参数对象)，自带request和response对象
 * 建议所有路由继承此基类
 */
class BaseRoute{
    /**
     * 数据对象
     */
    model:any;
    /**
     * request对象
     */
    request:HttpRequest;
    /**
     * response对象
     */
    response:HttpResponse;

    /**
     * 为model设置值
     * @param data  数据对象(由浏览器/客户端传入的数据参数)
     */
    setModel(data:any){
        this.model = data;
    }

    /**
     * 设置request对象
     * @param req   request对象
     */
    setRequest(req:HttpRequest):void{
        this.request = req;
    }

    /**
     * 设置reponse对象
     * @param res   response对象
     */
    setResponse(res:HttpResponse):void{
        this.response = res;
    }
}

export{BaseRoute};