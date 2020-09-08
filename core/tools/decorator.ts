/**
 * 装饰器（注解类）
 */
import{InstanceFactory} from '../main/instancefactory';
import { AopFactory } from '../main/aopfactory';
import { FilterFactory } from '../web/filterfactory';
import { TransactionManager } from '../database/transactionmanager';
import { RouteFactory } from '../main/route/routefactory';
import { NoomiError } from './errorfactory';


/**
 * @exclude
 * instance装饰器，添加实例到实例工厂，装饰类
 * @param cfg:object|string 如果为string，则表示实例名
 *          name:string     实例名，必填
 *          singleton:bool  是否单例，默认true
 *          params:object   参数
 */
function Instance(cfg){
    return (target) =>{
        let instanceName:string;
        let singleton:boolean;
        let params:any;
        if(typeof cfg === 'string'){
            instanceName = cfg;
            singleton = true;
        }else if(typeof cfg === 'object'){
            instanceName = cfg.name;
            singleton = cfg.singleton!==undefined?cfg.singleton:true;
            params = cfg.params;
        }
        if(!instanceName){
            throw new NoomiError("1011");
        }
        //设置实例名
        target.prototype.__instanceName = instanceName;
        InstanceFactory.addInstance({
            name:instanceName,  //实例名
            class:target,
            params:params,
            singleton:singleton
        });
    }
}

/**
 * @exclude
 * IoC注入装饰器，装饰属性
 * @param instanceName:string  实例名，必填
 */
function Inject(instanceName:string){
    return (target:any,propertyName:string)=>{
        InstanceFactory.addInject(target,propertyName,instanceName);
    }
}

/**
 * @exclude
 * 路由类装饰器，装饰类
 * @param cfg:object
 *          namespace:string    命名空间，namespace+该类下的所有方法对应的路由路径=路由完整路径，可选
 *          path:string         路径，路由路径为 namespace+path+方法名，设置时，对所有方法有效，可选
 */
function Router(cfg?:any){
    return (target)=>{
        let instanceName:string = '_nroute_' + target.name;
        let namespace = cfg&&cfg.namespace?cfg.namespace:''; 
        target.prototype.__routeconfig = {
            namespace:namespace
        }
        target.prototype.__instanceName = instanceName;
        //追加到instancefactory
        InstanceFactory.addInstance({
            name:instanceName,  //实例名
            class:target,
            singleton:false
        });
        //如果配置了path，则追加到路由，对所有方法有效
        if(cfg && cfg.path){
            let path:string = cfg.path;
            if(typeof path==='string' && (path=path.trim()) !== ''){
                setImmediate(()=>{
                    //延迟到Route注解后，便于先处理非*的路由
                    RouteFactory.addRoute(namespace + path + '(?!\\S+/)*',instanceName,null,cfg.results);
                });
            }
        }
    }
}

/**
 * @exclude
 * 路由装饰器，装饰方法
 * @param cfg:object|string             如果为string，则为路由路径，默认type json
 *          path:string                 路由路径，必填
 *          results:Array<object>       结果数组，可选，如果results未设置或数组长度为0，则按json处理，单个结果元素包含:
 *              value:any               方法返回结果，如果return值与value相同，则使用该结果
 *              type:string             结果类型，可选值:redirect(重定向),chain(路由链),void(空),json，默认为json
 *              url:string,             该方法对应的路由路径，完整路径=namespace+url，以/开头，
 *                                      如Router装饰器设置的namespace为/user,url为/getinfo,则访问路由为/user/getinfo
 *                                      type为redirect或chain时必须设置
 *              params:Array<string>    参数名数组，当url为路由时，params中存放当前路由所处实例的属性名，将属性名和其对应值加入url指向路由的输入参数
 *                                      如params:['p1','p2']，则传入url路由时的参数为{p1:v1,p2:v2}和路由自带的参数，可选
 */
function Route(cfg:any){
    return (target:any,propertyName:string)=>{
        setImmediate(()=>{
            let ns = target.__routeconfig?target.__routeconfig.namespace:'';
            if(typeof cfg === 'string'){ //直接配置路径，默认type json
                RouteFactory.addRoute(ns + cfg,target.__instanceName,propertyName);    
            }else{
                RouteFactory.addRoute(ns + cfg.path,target.__instanceName,propertyName,cfg.results);
            }
        });
    }
}
/**
 * @exclude
 * web过滤器，装饰方法
 * @param pattern:string|Array<string>  过滤表达式串或数组，支持通配符，默认为/*，过滤所有路由
 * @param order:number                  优先级，值越小优先级越高，默认10000，可选
 */
function WebFilter(pattern?:any,order?:number){
    return function(target:any,name:string){
        FilterFactory.addFilter({
            instance:target,
            method_name:name,
            url_pattern:pattern,
            order:order
        });
    } 
}

/**
 * @exclude
 * 切面装饰器，装饰类
 */
function Aspect(){
    return (target)=>{
        target.prototype.__isAspect = true;
    }
}

/**
 * @exclude
 * 切点装饰器，切点名为方法名+()，装饰方法
 * @param expressions:string|Array<string> 切点需要拦截的表达式串或数组，支持通配符*，
 *                                         拦截对象为instanceName.methodName，
 *                                         如user*.*拦截实例名为user开头的实例下的所有方法，
 *                                         userX.m1拦截实例名为userX的m1方法
 */
function Pointcut(expressions:any){
    return (target:any,name:string)=>{
        AopFactory.addPointcut(name+'()',expressions);
    }
}

/**
 * @exclude
 * 通知装饰器 before，装饰方法
 * @param pointcutId:string    切点id
 */
function Before(pointcutId:string){
    return (target:any,name:string,desc:any)=>{
        AopFactory.addAdvice({
            pointcut_id:pointcutId,
            type:'before',
            instance:target,
            method:name
        });
    }
}

/**
 * @exclude
 * 通知装饰器 after，装饰方法
 * @param pointcutId:string    切点id
 */
function After(pointcutId:string){
    return (target:any,name:string,desc:any)=>{
        AopFactory.addAdvice({
            pointcut_id:pointcutId,
            type:'after',
            instance:target,
            method:name
        });
    }
}

/**
 * @exclude
 * 通知装饰器 around，装饰方法
 * @param pointcutId:string    切点id
 */
function Around(pointcutId:string){
    return (target:any,name:string,desc:any)=>{
        AopFactory.addAdvice({
            pointcut_id:pointcutId,
            type:'around',
            instance:target,
            method:name
        });
    }
}
/**
 * @exclude
 * 通知装饰器 after-return，装饰方法
 * @param pointcutId:string   切点id
 */
function AfterReturn(pointcutId:string){
    return (target:any,name:string,desc:any)=>{
        AopFactory.addAdvice({
            pointcut_id:pointcutId,
            type:'after-return',
            instance:target,
            method:name
        });
    }
}

/**
 * @exclude
 * 通知装饰器 after-throw，装饰方法
 * @param pointcutId    切点id
 */
function AfterThrow(pointcutId:string){
    return (target:any,name:string,desc:any)=>{
        AopFactory.addAdvice({
            pointcut_id:pointcutId,
            type:'after-throw',
            instance:target,
            method:name
        });
    }
}

/**
 * @exclude
 * 事务类装饰器，装饰类
 * 该装饰器必须放在Instance装饰器之前使用
 * 把符合条件的方法装饰为事务方法
 * @param methodReg 数组或字符串，方法名表达式，可以使用*通配符，默认为*，表示该实例的所有方法都为事务方法
 */
function Transactioner(methodReg?:any){
    return (target)=>{
        if(!methodReg){
            methodReg = '*';
        }
        TransactionManager.addTransaction(target.prototype.__instanceName,methodReg);
    }
}
/**
 * @exclude
 * 事务装饰器，装饰方法
 */ 
function Transaction(){
    return (target:any,name:string,desc:any)=>{
        //方法注解先于类注解，尚无实例名，延迟执行
        setImmediate(()=>{
            TransactionManager.addTransaction(target.__instanceName,name);
        });
    }
}
export {Instance,Router,Route,WebFilter,Inject,Aspect,Pointcut,Before,After,Around,AfterReturn,AfterThrow,Transactioner,Transaction}