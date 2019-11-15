"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 装饰器（注解类）
 */
const instancefactory_1 = require("../main/instancefactory");
const aopfactory_1 = require("../main/aopfactory");
const filterfactory_1 = require("../web/filterfactory");
const transactionmanager_1 = require("../database/transactionmanager");
const routefactory_1 = require("../main/route/routefactory");
const errorfactory_1 = require("./errorfactory");
/**
 * instance装饰器，添加实例到实例工厂，装饰类
 * @param cfg:object|string 如果为string，则表示实例名
 *          name:string     实例名，必填
 *          singleton:bool  是否单例，默认false
 */
function Instance(cfg) {
    return (target) => {
        let instanceName;
        let singleton;
        let params;
        if (typeof cfg === 'string') {
            instanceName = cfg;
            singleton = true;
        }
        else if (typeof cfg === 'object') {
            instanceName = cfg.name;
            singleton = cfg.singleton;
            params = cfg.params;
        }
        if (!instanceName) {
            throw new errorfactory_1.NoomiError("1011");
        }
        //设置实例名
        target.prototype.__instanceName = instanceName;
        instancefactory_1.InstanceFactory.addInstance({
            name: instanceName,
            class: target,
            params: params,
            singleton: singleton || true
        });
    };
}
exports.Instance = Instance;
/**
 * IoC注入装饰器，装饰属性
 * @param instanceName:string  实例名，必填
 */
function Inject(instanceName) {
    return (target, propertyName) => {
        instancefactory_1.InstanceFactory.addInject(target, propertyName, instanceName);
    };
}
exports.Inject = Inject;
/**
 * 路由类装饰器，装饰类
 * @param cfg:object
 *          namespace:string    命名空间，namespace+该类下的所有方法对应的路由路径=路由完整路径，可选
 *          path:string         路径，路由路径为 namespace+path+方法名，设置时，对所有方法有效，可选
 */
function Router(cfg) {
    return (target) => {
        let instanceName = '_nroute_' + target.name;
        let namespace = cfg && cfg.namespace ? cfg.namespace : '';
        target.prototype.__routeconfig = {
            namespace: namespace
        };
        target.prototype.__instanceName = instanceName;
        //追加到instancefactory
        instancefactory_1.InstanceFactory.addInstance({
            name: instanceName,
            class: target,
            singleton: false
        });
        //如果配置了path，则追加到路由，对所有方法有效
        if (cfg && cfg.path) {
            let path = cfg.path;
            if (typeof path === 'string' && (path = path.trim()) !== '') {
                setImmediate(() => {
                    //延迟到Route注解后，便于先处理非*的路由
                    routefactory_1.RouteFactory.addRoute(namespace + path + '*', instanceName, null, cfg.results);
                });
            }
        }
    };
}
exports.Router = Router;
/**
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
function Route(cfg) {
    return (target, propertyName) => {
        setImmediate(() => {
            let ns = target.__routeconfig ? target.__routeconfig.namespace : '';
            if (typeof cfg === 'string') { //直接配置路径，默认type json
                routefactory_1.RouteFactory.addRoute(ns + cfg, target.__instanceName, propertyName);
            }
            else {
                routefactory_1.RouteFactory.addRoute(ns + cfg.path, target.__instanceName, propertyName, cfg.results);
            }
        });
    };
}
exports.Route = Route;
/**
 * web过滤器，装饰方法
 * @param pattern:string|Array<string>  过滤表达式串或数组，支持通配符，默认为/*，过滤所有路由
 * @param order:number                  优先级，值越小优先级越高，默认10000，可选
 */
function WebFilter(pattern, order) {
    return function (target, name) {
        filterfactory_1.FilterFactory.addFilter({
            instance: target,
            method_name: name,
            url_pattern: pattern,
            order: order
        });
    };
}
exports.WebFilter = WebFilter;
/**
 * 切面装饰器，装饰类
 */
function Aspect() {
    return (target) => {
        target.prototype.__isAspect = true;
    };
}
exports.Aspect = Aspect;
/**
 * 切点装饰器，切点名为方法名+()，装饰方法
 * @param expressions:string|Array<string> 切点需要拦截的表达式串或数组，支持通配符*，
 *                                         拦截对象为instanceName.methodName，
 *                                         如user*.*拦截实例名为user开头的实例下的所有方法，
 *                                         userX.m1拦截实例名为userX的m1方法
 */
function Pointcut(expressions) {
    return (target, name) => {
        aopfactory_1.AopFactory.addPointcut(name + '()', expressions);
    };
}
exports.Pointcut = Pointcut;
/**
 * 通知装饰器 before，装饰方法
 * @param pointcutId:string    切点id
 */
function Before(pointcutId) {
    return (target, name, desc) => {
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: pointcutId,
            type: 'before',
            instance: target,
            method: name
        });
    };
}
exports.Before = Before;
/**
 * 通知装饰器 after，装饰方法
 * @param pointcutId:string    切点id
 */
function After(pointcutId) {
    return (target, name, desc) => {
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: pointcutId,
            type: 'after',
            instance: target,
            method: name
        });
    };
}
exports.After = After;
/**
 * 通知装饰器 around，装饰方法
 * @param pointcutId:string    切点id
 */
function Around(pointcutId) {
    return (target, name, desc) => {
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: pointcutId,
            type: 'around',
            instance: target,
            method: name
        });
    };
}
exports.Around = Around;
/**
 * 通知装饰器 after-return，装饰方法
 * @param pointcutId:string   切点id
 */
function AfterReturn(pointcutId) {
    return (target, name, desc) => {
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: pointcutId,
            type: 'after-return',
            instance: target,
            method: name
        });
    };
}
exports.AfterReturn = AfterReturn;
/**
 * 通知装饰器 after-throw，装饰方法
 * @param pointcutId    切点id
 */
function AfterThrow(pointcutId) {
    return (target, name, desc) => {
        aopfactory_1.AopFactory.addAdvice({
            pointcut_id: pointcutId,
            type: 'after-throw',
            instance: target,
            method: name
        });
    };
}
exports.AfterThrow = AfterThrow;
/**
 * 事务类装饰器，装饰类
 * 该装饰器必须放在Instance装饰器之前使用
 * 把符合条件的方法装饰为事务方法
 * @param methodReg 数组或字符串，方法名表达式，可以使用*通配符，默认为*，表示该实例的所有方法都为事务方法
 */
function Transactioner(methodReg) {
    return (target) => {
        if (!methodReg) {
            methodReg = '*';
        }
        transactionmanager_1.TransactionManager.addTransaction(target.prototype.__instanceName, methodReg);
    };
}
exports.Transactioner = Transactioner;
/**
 * 事务装饰器，装饰方法
 */
function Transactional() {
    return (target, name, desc) => {
        transactionmanager_1.TransactionManager.addTransaction(target, name);
    };
}
exports.Transactional = Transactional;
//# sourceMappingURL=decorator.js.map