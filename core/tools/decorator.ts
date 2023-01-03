/**
 * 装饰器（注解类）
 */
import { InstanceFactory } from '../main/instancefactory';
import { AopFactory } from '../main/aopfactory';
import { FilterFactory } from '../web/filterfactory';
import { TransactionManager } from '../database/transactionmanager';
import { RouteFactory } from '../main/route/routefactory';
import { WebAfterHandler } from '../web/webafterhandler';
import { LogManager } from '../log/logmanager';
import { LaunchHookManager } from './launchhookmanager';


/**
 * @exclude
 * instance装饰器，添加实例到实例工厂，装饰类
 * @param cfg:object|string 如果为string，则表示实例名
 *          name:string     实例名，必填
 *          singleton:bool  是否单例，默认true
 *          params:object   参数
 */
function Instance(cfg?:any){
    return (target) =>{
        InstanceFactory.addInstance(target,cfg);
    }
}

/**
 * @exclude
 * IoC注入装饰器，装饰属性
 * @param clazz     注入类
 */
function Inject(clazz:any){
    return (target:any,propertyName:string)=>{
        InstanceFactory.inject(target.constructor,propertyName,clazz);
    }
}

/**
 * @exclude
 * 路由类装饰器，装饰类
 * @param cfg:object            可选
 *          namespace:string    命名空间，namespace+该类下的所有方法对应的路由路径=路由完整路径，可选
 *          path:string         路径，支持通配符,如: "*"表示该类下的所有方法，"add*"表示以add开头的所有方法
 */
function Router(cfg?:any){
    return (target)=>{
        //如果配置了path，则追加到路由，对所有方法有效
        if(cfg){
            //存在路径，则对所有方法有效
            if(cfg.path){
                cfg.path = cfg.path.trim();
                if(cfg.path === ''){
                    delete cfg.path;
                } 
            }
            cfg.clazz = target;
            RouteFactory.registRoute(cfg);
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
        if(typeof cfg === 'string'){ //直接配置路径，默认type json
            RouteFactory.registRoute({
                path:cfg,
                clazz:target.constructor,
                method:propertyName
            });    
        }else{
            cfg.clazz = target.constructor;
            cfg.method = propertyName;
            RouteFactory.registRoute(cfg);
        }
    }
}
/**
 * @exclude
 * web过滤器，装饰方法
 * @param pattern:RegExp|Array<RegExp>  过滤正则表达式或表达式数组，默认为 .*，过滤所有请求
 * @param order:number                  优先级，值越小优先级越高，默认10000，可选
 */
function WebFilter(pattern?:any,order?:number){
    return (target:any,name:string)=>{
        FilterFactory.addFilter({
            clazz:target.constructor,
            method:name,
            patterns:pattern,
            order:order
        });
    } 
}

/**
 * @exclude
 * web后置处理器，装饰方法
 * @param pattern:RegExp|Array<RegExp>  过滤正则表达式或表达式数组，默认为 .*，处理所有请求
 * @param order:number                  优先级，值越小优先级越高，默认10000，可选
 */
 function WebHandler(pattern?:any,order?:number){
    return (target:any,name:string)=>{
        WebAfterHandler.addHandler({
            clazz:target.constructor,
            method:name,
            patterns:pattern,
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
        //处理切面
        AopFactory.addAspect(target);
    }
}

/**
 * @exclude
 * 切点装饰器，切点名为属性名，装饰属性
 * @param expressions:string|Array<string> 切点需要拦截的表达式串或数组，支持通配符*，
 *                                         拦截对象为instanceName.methodName，
 *                                         如user*.*拦截实例名为user开头的实例下的所有方法，
 *                                         userX.m1拦截实例名为userX的m1方法
 */
function Pointcut(expressions?:any){
    return (target:any,name:string)=>{
        AopFactory.registPointcut({
            id:name,
            expressions:expressions,
            clazz:target.constructor
        });
    }
}

/**
 * @exclude
 * 通知装饰器 before，装饰方法
 * @param pointcutId:string    切点id
 */
function Before(pointcutId:string){
    return (target:any,name:string,desc:any)=>{
        AopFactory.registAdvice({
            pointcutId:pointcutId,
            type:'before',
            clazz:target.constructor,
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
        AopFactory.registAdvice({
            pointcutId:pointcutId,
            type:'after',
            clazz:target.constructor,
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
        AopFactory.registAdvice({
            pointcutId:pointcutId,
            type:'around',
            clazz:target.constructor,
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
        AopFactory.registAdvice({
            pointcutId:pointcutId,
            type:'after-return',
            clazz:target.constructor,
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
        AopFactory.registAdvice({
            pointcutId:pointcutId,
            type:'after-throw',
            clazz:target.constructor,
            method:name
        });
    }
}

/**
 * @exclude
 * 事务类装饰器，装饰类
 * 如果同时使用instance装饰器，该装饰器必须放在Instance装饰器之后
 * 把符合条件的方法装饰为事务方法
 * @param methodReg 数组或字符串，方法名表达式，可以使用*通配符，默认为*，表示该实例的所有方法都为事务方法
 */
function Transactioner(methodReg?:any){
    return (target)=>{
        if(!methodReg){
            methodReg = '*';
        }
        TransactionManager.addTransaction(target,methodReg || '*');
        
    }
}
/**
 * @exclude
 * 事务装饰器，装饰方法
 */ 
function Transaction(){
    return (target:any,name:string)=>{
        TransactionManager.addTransaction(target.constructor,name);
    }
}

/**
 * @exclude
 * 数据模型装饰器，装饰类
 * @since 0.4.8
 * @param types     验证集{validatorName:参数数组(可以是空数组)}
 */ 
function DataModel(clazz:object){
    return (target)=>{
        target.__modelClass = clazz;
    }
}

/**
 * @exclude
 * 模型属性装饰器，装饰属性
 * @since 0.4.8
 * @param type  数据类型 number,string,boolean,array
 */ 
function DataType(type:string){
    return (target:any,name:string)=>{
        target.constructor.__setType(name,type);
    }
}

/**
 * @exclude
 * 模型属性装饰器，装饰属性
 * @since 0.4.8
 * @param types     验证集{validatorName:参数数组(可以是空数组)}
 */ 
function DataValidator(types:object){
    return (target:any,name:string)=>{
        target.constructor.__setValidator(name,types);
    }
}

/**
 * @exclude
 * 数据null检查，装饰路由方法
 * @since 0.4.8
 * @param props     待检查属性数组
 */ 
function NullCheck(props:Array<string>){
    return (target:any,name:string)=>{
        target.constructor.__setNullCheck(name,props);
    }
}

/**
 * 日志装饰器，装饰类
 * @param cfg  配置对象
 * expression: 可选 表达式字符串或数组
 * cateName: 可选 日志输出类型:default表示输出到控制台，toFile表示输出到文件
 */
function Logger(cfg: any) {
    return (target) => {
        if(!cfg.expression) {
            cfg.expression = ['*'];
        }else if(!Array.isArray(cfg.expression)) {
            cfg.expression = [cfg.expression];
        }
        LogManager.init(cfg);
    }
}

/**
 * 钩子函数装饰器，装饰方法
 * 用于项目初始化完成后的自定义代码执行
 * @params 钩子方法的参数数组
 */
function LaunchHook(params?: Array<any>) {
    return (target, methodName) => {
        if(!params) {
            params = [];
        }
        LaunchHookManager.init({
            clazz: target.constructor,
            method: methodName,
            params: params
        });
    }
}
export {Instance,Router,Route,WebFilter,WebHandler,Inject,Aspect,Pointcut,Before,After,Around,AfterReturn,AfterThrow,Transactioner,Transaction,DataModel,DataType,DataValidator,NullCheck,Logger,LaunchHook}