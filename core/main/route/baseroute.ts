import { HttpRequest} from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
import { BaseModel } from "../../tools/model";
import { NoomiError } from "../../tools/errorfactory";
/**
 * 路由基类
 * 可自动为路由类生成model(传入参数对象)，自带request和response对象
 * 建议所有路由继承此基类
 */
class BaseRoute{
    /**
     * 模型类
     */
    public __modelClass:any;

    /**
     * null属性检查{方法名:待检查属性数组}
     */
    private __nullCheckMap:Map<string,Array<string>>;

    /**
     * 数据对象
     */
    public model:any;

    /**
     * request对象
     */
    public request:HttpRequest;
    
    /**
     * response对象
     */
    public response:HttpResponse;


    /**
     * 为model设置值
     * @param data  数据对象(由浏览器/客户端传入的数据参数)
     * @returns     无异常null，否则返回异常字段集
     */
    public setModel(data:any,nullArr?:Array<string>){
        if(this.__modelClass){
            let m:BaseModel = new this.__modelClass();
            if(nullArr){
                for(let p of nullArr){
                    m.__addValidator(p,'nullable');
                }
            }
            Object.getOwnPropertyNames(data).forEach((item)=>{
                m[item] = data[item];
            });
            let isJsonReq:boolean = false;
            let ctType:string = <string>this.request.getHeader('content-type');
            if(ctType){
                isJsonReq = ctType.startsWith('application/json');
            }
            
            //数据转换和校验，如果request content-type为application/json，则不进行转换
            let r = m.__handle(isJsonReq);
            if(r){
                throw new Error(JSON.stringify(r));
            }
            this.model = m;
        }else{
            this.model = data;
        }
        return null;
    }

    /**
     * 设置request对象
     * @param req   request对象
     */
    public setRequest(req:HttpRequest):void{
        this.request = req;
    }

    /**
     * 设置reponse对象
     * @param res   response对象
     */
    public setResponse(res:HttpResponse):void{
        this.response = res;
    }

    /**
     * 增加nullcheck 方法
     * @param methodName    方法名
     * @param props         检测数组
     */
    public __addNullCheck(methodName:string,props:Array<string>){
        if(!this.__nullCheckMap){
            this.__nullCheckMap = new Map();
        }
        this.__nullCheckMap.set(methodName,props);
    }

    /**
     * 获取null check 数组
     * @param methodName 方法名
     */
    public __getNullCheck(methodName:string):Array<string>{
        if(this.__nullCheckMap){
            return this.__nullCheckMap.get(methodName);
        }
        return null;
    }
}

export{BaseRoute};