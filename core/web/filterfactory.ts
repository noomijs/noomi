import { InstanceFactory } from "../main/instancefactory";
import { NoomiError } from "../tools/errorfactory";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { HttpRequest } from "./httprequest";
import { HttpResponse } from "./httpresponse";

/**
 * 过滤器配置类型
 */
interface IFilterCfg{
    /**
     * 实例名(与instance二选一)
     */
    instance_name?:string;
    /**
     * 方法名,默认do
     * 方法需要返回true/false，如果为false，则表示不再继续执行（过滤器链）
     */
    method_name?:string; 
    /**
     * 正则表达式串，或数组
     */
    url_pattern?:string|Array<string>;
    /**
     * 优先级，越小越高，1-10为框架保留，创建时尽量避免，默认10000
     */
    order?:number;
}

/**
 * filter类型
 */
interface IFilter{
    /**
     * 实例名
     */
    instance:string; 
    /**
     * 方法名
     */          
    method:string;
    /**
     * 正则表达式数组
     */
    patterns:Array<RegExp>; 
    /**
     * 优先级，越小越高，1-10为框架保留，默认10000
     */
    order:number;

}


/**
 * 过滤器工厂类
 * @remarks 
 * 用于管理所有过滤器对象
 */
class FilterFactory{
    /**
     * 过滤器实例数组
     */
    static filters:Array<IFilter> = [];

    /**
     * 添加过滤器到工厂
     * @param cfg   过滤器配置项
     */
    static addFilter(cfg:IFilterCfg):void{
        let insName:string = cfg.instance_name;
        if(!insName){
            return;
        }
        //方法名,默认方法do
        let method = cfg.method_name || 'do';
        // 正则式数组
        let ptns:Array<RegExp> = [];
        //默认 "/*"
        if(!cfg.url_pattern){
            ptns = [/^\/*/];
        }else if(Array.isArray(cfg.url_pattern)){ //数组
            cfg.url_pattern.forEach((item)=>{
                ptns.push(Util.toReg(item));
            });
        }else{ //字符串
            ptns.push(Util.toReg(cfg.url_pattern));
        }
        
        //查找重复过滤器类
        let f:IFilter = this.filters.find(item=>{
            return item.instance === insName && item.method === method;
        });
        
        //删除之前添加的过滤器
        if(f){
            let ind = this.filters.indexOf(f);
            this.filters.splice(ind,1);
        }
        //加入过滤器集合
        this.filters.push({
            instance:insName,
            method:method,
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
    static parseFile(path:string):void{
        //读取文件
        let jsonStr:string = App.fs.readFileSync(path,'utf-8');
        let json:object = null;
        try{
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2200") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 初始化
     * @param config {filters:[{IFilterCfg1},...]}
     */
    static init(config){
        //处理filters
        if(Array.isArray(config.filters)){
            config.filters.forEach((item:IFilterCfg)=>{
                this.addFilter(item);
            });
        }
    }
    /**
     * 获取过滤器链
     * @param url   资源url 
     * @returns     filter数组
     */
    static getFilterChain(url:string):Array<IFilter>{
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
     * @param           全部执行完为true，否则为false
     */
    static async doChain(url:string,request:HttpRequest,response:HttpResponse):Promise<boolean>{
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

export{FilterFactory}