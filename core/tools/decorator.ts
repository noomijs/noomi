/**
 * 装饰器（注解类）
 */
import {InstanceFactory} from '../main/instancefactory';
import {FilterFactory} from '../web/filterfactory';
import {TransactionManager} from '../database/transactionmanager';
import {RouteFactory} from '../main/route/routefactory';
import {WebAfterHandler} from '../web/webafterhandler';
import {LogManager} from '../log/logmanager';
import {LaunchHookManager} from './launchhookmanager';
import { AopFactory } from '../main/aop/aopfactory';
import { CommonDataType, PropOption, UnknownClass } from '../types/other';
import { RouteConfig } from '../types/routetypes';
import { InstanceOption } from '../types/instancetypes';
import { LogOption } from '../types/logtypes';
import { ModelManager } from './modelmanager';

/**
 * instance装饰器，添加实例到实例工厂，装饰类
 * @param cfg - 配置项或singleton设置，如果为boolean，则为singleton设置
 */
export function Instance(cfg?: InstanceOption|boolean) {
    return (target) => {
        InstanceFactory.addInstance(target, cfg);
    }
}

/**
 * IoC注入装饰器，装饰属性
 * @param clazz -   注入类
 */
export function Inject(clazz: unknown) {
    return (target: unknown, propertyName: string) => {
        InstanceFactory.inject(target.constructor, propertyName, clazz);
    }
}

/**
 * 路由类装饰器，装饰类
 * @param cfg - 配置项
 * 
 * 说明：
 * 
 *   namespace:命名空间，可选，namespace+path匹配的方法名=路由完整路径
 * 
 *   path:路径，支持通配符,如: "*"表示该类下的所有方法，"add*"表示以add开头的所有方法
 */
export function Router(cfg?: RouteConfig) {
    return (target) => {
        // 如果配置了path，则追加到路由，对所有方法有效
        if (cfg) {
            if (cfg.path) {
                cfg.path = cfg.path.trim();
                if (cfg.path === '') {
                    delete cfg.path;
                }
            }
        }else{
            cfg = {};
        }
        //默认为全部匹配
        if(!cfg.path){
            cfg.path = '*';
        }
        //默认为 '/'
        cfg.namespace ||= '/';
        cfg.clazz = target;
        cfg.batch = true;
        RouteFactory.registRoute(cfg);
    }
}

/**
 * 路由装饰器，装饰方法
 * @param cfg - 配置项，如果为string，则为路由路径，默认type=‘json’
 *          
 */
export function Route(cfg: RouteConfig|string) {
    return (target: unknown, propertyName: string) => {
        if (typeof cfg === 'string') { //直接配置路径，默认type json
            RouteFactory.registRoute({
                path: cfg,
                clazz: target.constructor,
                method: propertyName
            });
        } else {
            cfg.clazz = target.constructor;
            cfg.method = propertyName;
            RouteFactory.registRoute(cfg);
        }
    }
}

/**
 * web过滤器，装饰方法
 * @param pattern - RegExp|Array<RegExp>  过滤正则表达式或表达式数组，默认为 .*，过滤所有请求
 * @param order -   number                优先级，值越小优先级越高，默认10000，可选
 */
export function WebFilter(pattern?: RegExp|RegExp[], order?: number) {
    return (target: unknown, name: string) => {
        if(!Array.isArray(pattern)){
            pattern = [pattern];
        }
        FilterFactory.addFilter({
            clazz: target.constructor,
            method: name,
            patterns: pattern,
            order: order
        });
    }
}

/**
 * web后置处理器，装饰方法
 * @param pattern - 过滤正则表达式或表达式数组，默认为 .*，处理所有请求
 * @param order -   优先级，值越小优先级越高，默认10000，可选
 */
export function WebHandler(pattern?: RegExp|Array<RegExp>, order?: number) {
    return (target: unknown, name: string) => {
        if(!Array.isArray(pattern)){
            pattern = [pattern];
        }
        WebAfterHandler.addHandler({
            clazz: target.constructor,
            method: name,
            patterns: pattern,
            order: order
        });
    }
}

/**
 * 切面装饰器，装饰类
 */
export function Aspect() {
    return (target) => {
        // 处理切面
        AopFactory.addAspect(target);
    }
}

/**
 * 切点装饰器，切点名为属性名，装饰属性
 * @param expressions - 切点需要拦截的表达式串数组
 * @remarks
 * 支持通配符*，拦截对象为instanceName.methodName，
 * 
 * 如`user*.*`拦截实例名为user开头的实例下的所有方法，
 * 
 * `userX.m1`拦截实例名为userX的m1方法
 */
export function Pointcut(expressions?: string[]) {
    return (target: unknown, name: string) => {
        AopFactory.registPointcut({
            id: name,
            expressions: expressions,
            clazz: target.constructor
        });
    }
}

/**
 * 通知装饰器 before，装饰方法
 * @param pointcutId -  切点id
 */
export function Before(pointcutId: string) {
    return (target: unknown, name: string) => {
        AopFactory.registAdvice({
            pointcutId: pointcutId,
            type: 'before',
            clazz: target.constructor,
            method: name
        });
    }
}

/**
 * 通知装饰器 after，装饰方法
 * @param pointcutId -  切点id
 */
export function After(pointcutId: string) {
    return (target: unknown, name: string) => {
        AopFactory.registAdvice({
            pointcutId: pointcutId,
            type: 'after',
            clazz: target.constructor,
            method: name
        });
    }
}

/**
 * 通知装饰器 around，装饰方法
 * @param pointcutId -  切点id
 */
export function Around(pointcutId: string) {
    return (target: unknown, name: string) => {
        AopFactory.registAdvice({
            pointcutId: pointcutId,
            type: 'around',
            clazz: target.constructor,
            method: name
        });
    }
}

/**
 * 通知装饰器 after-return，装饰方法
 * @param pointcutId -  切点id
 */
export function AfterReturn(pointcutId: string) {
    return (target: unknown, name: string) => {
        AopFactory.registAdvice({
            pointcutId: pointcutId,
            type: 'after-return',
            clazz: target.constructor,
            method: name
        });
    }
}

/**
 * 通知装饰器 after-throw，装饰方法
 * @param pointcutId -  切点id
 */
export function AfterThrow(pointcutId: string) {
    return (target: unknown, name: string) => {
        AopFactory.registAdvice({
            pointcutId: pointcutId,
            type: 'after-throw',
            clazz: target.constructor,
            method: name
        });
    }
}

/**
 * 事务类装饰器，装饰类
 * @remarks
 * 把符合条件的方法装饰为事务方法，如果没有使用Instance装饰器，则会默认添加
 * 
 * @param methodReg - 方法名表达式，字符串或字符串数组，可以使用含`*`的通配符，默认为`*`，表示该实例的所有方法都为事务方法
 */
export function Transactioner(methodReg?: string|string[]) {
    return (target) => {
        TransactionManager.addTransaction(target, methodReg || '*');
    }
}

/**
 * 事务方法装饰器，装饰方法
 * @remarks
 * 如果没有Transactioner和Instance修饰此方法对应的类，则会默认添加Instance装饰器
 */
export function Transaction() {
    return (target: unknown, name: string) => {
        TransactionManager.addTransaction(<UnknownClass>target.constructor, name);
    }
}

/**
 * 数据模型装饰器，装饰类
 * @param clazz - 模型类
 */
export function DataModel(clazz: unknown) {
    return (target) => {
        target.__modelClass = clazz;
    }
}

/**
 * 属性装饰器，装饰属性，使用DataModel时有效
 * @param cfg - 配置项，如果为字符串，则表示为类型
 */
export function Prop(cfg?:PropOption|string){
    return (target: unknown, name: string) => {
        if(cfg){
            if(typeof cfg === 'string'){
                ModelManager.setProp(target.constructor.name,name,{type:<CommonDataType>cfg});    
            }else{
                if(cfg.validator && typeof cfg.validator === 'string'){
                    const o = {};
                    o[cfg.validator] = [];
                    cfg.validator = o;
                }
                ModelManager.setProp(target.constructor.name,name,cfg);
            }
        }else{
            ModelManager.setProp(target.constructor.name,name,{});
        }
    }
}

/**
 * 数据null检查，装饰路由方法
 * @param props -     待检查属性数组
 */
export function NullCheck(props: Array<string>) {
    return (target: unknown, name: string) => {
        ModelManager.setNullCheck(target.constructor.name,name, props);
    }
}

/**
 * 日志装饰器，装饰类
 * @param cfg -  配置对象
 */
export function Logger(cfg: LogOption) {
    return (target:unknown) => {
        if (!cfg.expression) {
            cfg.expression = ['*'];
        } else if (!Array.isArray(cfg.expression)) {
            cfg.expression = [cfg.expression];
        }
        LogManager.init(cfg);
    }
}

/**
 * 钩子函数装饰器，装饰方法
 * @remarks
 * 用于项目初始化完成后的自定义代码执行
 * @param params -      钩子方法的参数数组
 */
export function LaunchHook(params?: Array<unknown>) {
    return (target, methodName) => {
        if (!params) {
            params = [];
        }
        LaunchHookManager.init({
            clazz: target.constructor,
            method: methodName,
            params: params
        });
    }
}