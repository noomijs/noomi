import { InstanceFactory } from "../main/instancefactory";
import { NoomiError } from "../tools/errorfactory";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";
import { IFilter, IFilterCfg } from "../tools/types";


/**
 * 过滤器工厂类
 * 如果处理方法返回false，表示后续过滤器方法不再执行
 */
export class FilterFactory{
    /**
     * 过滤器实例数组
     */
    private static filters:Array<IFilter> = [];

    /**
     * 待添加的过滤器map，键为类名，值为 {
                methodName:方法名,
                pattern:正则式或正则式数组,
                order:优先级
            }
     */
    private static registFilterMap:Map<string,IFilterCfg> = new Map();

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
    public static registFilter(cfg:IFilterCfg){
        let name = cfg.className;
        delete cfg.className;
        this.registFilterMap.set(name,cfg);
    }

    /**
     * 处理实例过滤器
     * @param instanceName  实例名
     * @param className     类名
     * @since 1.0.0
     */
    public static handleInstanceFilter(instanceName:string,className:string){
        if(!this.registFilterMap.has(className)){
            return;
        }
        const cfg = this.registFilterMap.get(className);
        let ptns = [];
        if(!cfg.pattern){
            ptns = [/^\/.*/];
        }else if(!Array.isArray(cfg.pattern)){ //非数组
            ptns = [cfg.pattern];
        }

        //查找重复过滤器类
        let f:IFilter = this.filters.find(item=>{
            return item.instance === instanceName && item.method === cfg.methodName;
        });
        
        //删除之前添加的过滤器
        if(f){
            let ind = this.filters.indexOf(f);
            this.filters.splice(ind,1);
        }
        //加入过滤器集合
        this.filters.push({
            instance:instanceName,
            method:cfg.methodName,
            patterns:ptns,
            order:cfg.order===undefined?10000:cfg.order
        });

        this.filters.sort((a,b)=>{
            return a.order - b.order;
        });
    }
    
    /**
     * @exclude
     * 文件解析
     * @param path      filter的json文件
     */
    // static parseFile(path:string):void{
    //     //读取文件
    //     let jsonStr:string = App.fs.readFileSync(path,'utf-8');
    //     let json:object = null;
    //     try{
    //         json = App.JSON.parse(jsonStr);
    //     }catch(e){
    //         throw new NoomiError("2200") + '\n' + e;
    //     }
    //     this.init(json);
    // }

    /**
     * 初始化
     * @param config {filters:[{IFilterCfg1},...]}
     */
    // static init(config){
    //     //处理filters
    //     if(Array.isArray(config.filters)){
    //         config.filters.forEach((item:IFilterCfg)=>{
    //             this.addFilter(item);
    //         });
    //     }
    // }
    
    /**
     * 获取过滤器链
     * @param url   资源url 
     * @returns     filter数组
     */
    public static getFilterChain(url:string):Array<IFilter>{
        let arr:Array<IFilter> = [];
        this.filters.forEach((item:IFilter)=>{
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
     * @param request   request 对象
     * @param response  response 对象
     * @returns         全部执行完为true，否则为false
     */
    public static async doChain(url:string,request:HttpRequest,response:HttpResponse):Promise<boolean>{
        let arr:Array<IFilter> = FilterFactory.getFilterChain(url);
        if(arr.length === 0){
            return true;
        }
        
        for(let item of arr){
            let ins = InstanceFactory.getInstance(item.instance);
            if(!ins){
                continue;
            }
            if(typeof ins[item.method] === 'function'){
                if(!await InstanceFactory.exec(ins,item.method,[request,response])){
                    return false;
                }
            }
        }
        return true;
    }
}