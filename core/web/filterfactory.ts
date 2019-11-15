import { InstanceFactory } from "../main/instancefactory";
import { NoomiError } from "../tools/errorfactory";
import { Util } from "../tools/util";
import { App } from "../tools/application";

interface FilterConfig{
    instance_name?:string;  //实例名(与instance二选一)
    method_name?:string;    //方法名,默认do
    url_pattern?:any;       //正则表达式串，或数组
    instance?:any;          //实例
    order?:number;           //优先级，越小越高
}

/**
 * filter
 */
interface Filter{
    instance:any;           //实例或实例名
    method:string;          //方法名
    patterns:Array<RegExp>; //正则表达式
    order:number;           //优先级，越小越高，默认100000
}



/**
 * 过滤器工厂类
 */
class FilterFactory{
    static filters:Array<Filter> = [];
    
    /**
     * 添加过滤器到工厂
     * @param name          过滤器名
     * @param instanceName  实例名
     */
    static addFilter(cfg:FilterConfig):void{
        let ins:any = cfg.instance || cfg.instance_name;
        let ptns:Array<RegExp> = [];
        //默认 /*
        if(!cfg.url_pattern){
            ptns = [/^\/*/];
        }else if(Array.isArray(cfg.url_pattern)){ //数组
            cfg.url_pattern.forEach((item)=>{
                ptns.push(Util.toReg(item));
            });
        }else{ //字符串
            ptns.push(Util.toReg(cfg.url_pattern));
        }

        //加入过滤器集合
        this.filters.push({
            instance:ins,
            method:cfg.method_name || 'do', //默认do
            patterns:ptns,
            order:cfg.order||1000
        });

        this.filters.sort((a,b)=>{
            return a.order - b.order;
        });
    }

    /**
     * 文件解析
     * @param path      filter的json文件
     */
    static parseFile(path:string):void{
        //读取文件
        let jsonStr:string = App.fs.readFileSync(App.path.posix.join(process.cwd(),path),'utf-8');
        let json:any = null;
        try{
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2200") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 初始化
     * @param config 
     */
    static init(config){
        //处理filters
        if(Array.isArray(config.filters)){
            config.filters.forEach((item:FilterConfig)=>{
                this.addFilter(item);
            });
        }
    }
    /**
     * 获取过滤器链
     * @param url   url
     * @returns     filter名数组
     */
    static getFilterChain(url:string):Array<Filter>{
        let arr:Array<Filter> = [];
        this.filters.forEach((item:Filter)=>{
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
     * @param request   httprequest    
     * @param response  httpresponse
     * @param           promise boolean
     */
    static async doChain(url:string,request:any,response:any):Promise<boolean>{
        let arr:Array<Filter> = FilterFactory.getFilterChain(url);
        if(arr.length === 0){
            return true;
        }
        
        //过滤器方法集合
        let methods:Array<Function> = [];
        //根据过滤器名找到过滤器实例
        arr.forEach(item=>{
            //可能是实例名，需要从实例工厂中获得
            let ins = typeof item.instance === 'string'? InstanceFactory.getInstance(item.instance):item.instance;
            if(!ins){
                return;
            }
            if(typeof ins[item.method] === 'function'){
                methods.push(ins[item.method]);
            }
        });

        //全部通过才通过
        for(let i=0;i<methods.length;i++){
            if(!await methods[i](request,response)){
                return false;
            }
        }
        return true;
    }
}

export{FilterFactory}