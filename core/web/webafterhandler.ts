import { InstanceFactory } from "../main/instancefactory";
import { IFilter, IFilterCfg } from "../tools/types";
import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";

/**
 * web后置处理，对web请求结果进行再处理
 * 如果处理方法返回为null，则处理链不再继续处理
 */
class WebAfterHandler{
    /**
     * 过滤器实例数组
     */
     private static handlers:Array<IFilter> = [];

     /**
      * 待添加的处理器map，键为类名，值为 {
                 methodName:方法名,
                 pattern:正则式或正则式数组,
                 order:优先级
             }
      */
     private static registHandlerMap:Map<string,IFilterCfg> = new Map();
 
     /**
      * 注册过滤器
      * 当对应类添加到实例工厂时，进行过滤器添加
      * @param cfg   {
      *                  className:类名,
      *                  methodName:过滤器方法名,
      *                  pattern:过滤url的正则式或正则式数组,
      *                  order:优先级
      *              }
      * @since 1.0.0
      */
     public static registHandler(cfg:IFilterCfg){
         let name = cfg.className;
         delete cfg.className;
         this.registHandlerMap.set(name,cfg);
     }
 
     /**
      * 处理实例过滤器
      * @param instanceName  实例名
      * @param className     类名
      * @since 1.0.0
      */
     public static handleInstanceHandler(instanceName:string,className:string){
         if(!this.registHandlerMap.has(className)){
             return;
         }
         const cfg = this.registHandlerMap.get(className);
         let ptns = [];
         if(!cfg.pattern){
             ptns = [/^\/.*/];
         }else if(!Array.isArray(cfg.pattern)){ //非数组
             ptns = [cfg.pattern];
         }
 
         //查找重复过滤器类
         let f:IFilter = this.handlers.find(item=>{
             return item.instance === instanceName && item.method === cfg.methodName;
         });
         
         //删除之前添加的过滤器
         if(f){
             let ind = this.handlers.indexOf(f);
             this.handlers.splice(ind,1);
         }
         //加入过滤器集合
         this.handlers.push({
             instance:instanceName,
             method:cfg.methodName,
             patterns:ptns,
             order:cfg.order===undefined?10000:cfg.order
         });
 
         this.handlers.sort((a,b)=>{
             return a.order - b.order;
         });
     }

    /**
     * 获取过滤器链
     * @param url   资源url 
     * @returns     filter数组
     */
    private static getHandlerChain(url:string):Array<IFilter>{
        let arr:Array<IFilter> = [];
        this.handlers.forEach((item:IFilter)=>{
            let reg:RegExp;
            for(reg of item.patterns){
                //找到匹配
                if(reg.test(url)){
                    arr.push(item);
                    return;
                }
            }
        });
        return arr;
    }

    /**
     * 执行过滤器链
     * @param url       url路径
     * @param result    处理结果
     * @param request   request 对象
     * @param response  response 对象
     * @returns         处理结果进行方法链处理，返回最后的处理结果
     */
    public static async doChain(url:string,result:any,request:HttpRequest,response:HttpResponse):Promise<any>{
        let arr:Array<IFilter> = WebAfterHandler.getHandlerChain(url);
        if(arr.length === 0){
            return result;
        }
        for(let item of arr){
            let ins = InstanceFactory.getInstance(item.instance);
            if(!ins){
                continue;
            }
            if(typeof ins[item.method] === 'function'){
                //处理结果为null，表示不继续执行方法链
                result = await InstanceFactory.exec(ins,item.method,[result,request,response]);
                if(result === null){
                    return null;
                }
            }
        }
        return result;
    }
}

export{WebAfterHandler}