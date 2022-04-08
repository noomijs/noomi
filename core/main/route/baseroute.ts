import { HttpRequest} from "../../web/httprequest";
import { HttpResponse } from "../../web/httpresponse";
import { BaseModel } from "../../tools/model";
import { Validator } from "../../tools/validator";
import { Util } from "../../tools/util";
import { NoomiModelTip } from "../../locales/noomimodeltip";
import { App } from "../../tools/application";
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
     * null属性检查{方法名:待检查属性map}
     */
    private static __nullCheckMap:Map<string,string[]> = new Map();

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
     * 空校验
     * @oaram model         模型数据
     * @param methodName    方法名
     * @returns             校验异常信息
     */
    public doNullCheck(model:any,methodName:string){
        let fields = this.constructor['__nullCheckMap'].get(methodName);
        if(!fields){
            return null;
        }
        for(let f of fields){
            if(!Validator.validate("nullable",model[f],null)){
                return Util.compileString(NoomiModelTip[App.language]['nullable'],f);    
            }
        }
    }
    /**
     * 为model设置值
     * @param data  数据对象(由浏览器/客户端传入的数据参数)
     * @returns     无异常null，否则返回异常字段集
     */
    public setModel(data:any,methodName?:string){
        const mCls = this.constructor['__modelClass'];
        if(mCls){
            let m:BaseModel;
            if(methodName){
                //设置null check字段
                let nullArr = this.constructor['__nullCheckMap'].get(methodName);
                m = Reflect.construct(mCls,[nullArr]);
            }else{
                m = Reflect.construct(mCls,[]);
            }
            
            Object.getOwnPropertyNames(data).forEach((item)=>{
                m[item] = data[item];
            });
            let ctType:string = <string>this.request.getHeader('content-type');
            //数据转换和校验，如果request content-type为application/json，则不进行转换
            if(!ctType || !ctType.startsWith('application/json')){
                let r = m.__handle();
                if(r){
                    throw r;
                }
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
    public static __setNullCheck(methodName:string,props:Array<string>){
        if(!this.__nullCheckMap){
            this.__nullCheckMap = new Map();
        }else if(this.__nullCheckMap.has(methodName)){ //已经存在
            return;
        }
        this.__nullCheckMap.set(methodName,props);
    }
}

export{BaseRoute};