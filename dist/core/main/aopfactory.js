"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instancefactory_1 = require("./instancefactory");
const aopproxy_1 = require("./aopproxy");
const errorfactory_1 = require("../tools/errorfactory");
const transactionmanager_1 = require("../database/transactionmanager");
const util_1 = require("../tools/util");
const application_1 = require("../tools/application");
/**
 * aop 切点
 */
class AopPointcut {
    constructor(id, expressions, proxyClass) {
        //表达式数组（正则表达式）
        this.expressions = [];
        this.advices = [];
        this.id = id;
        this.proxyClass = proxyClass || aopproxy_1.AopProxy;
        if (!expressions) {
            throw new errorfactory_1.NoomiError("2001");
        }
        if (!Array.isArray(expressions)) {
            expressions = [expressions];
        }
        expressions.forEach((item) => {
            if (typeof item !== 'string') {
                throw new errorfactory_1.NoomiError("2001");
            }
            this.expressions.push(util_1.Util.toReg(item));
        });
    }
    /**
     * 匹配方法是否满足表达式
     * @param instanceName  实例名
     * @param methodName    待检测方法
     * @return              true/false
     */
    match(instanceName, methodName) {
        for (let i = 0; i < this.expressions.length; i++) {
            if (this.expressions[i].test(instanceName + '.' + methodName)) {
                return true;
            }
        }
        return false;
    }
    /**
     * 给切点添加通知
     * @param advice
     */
    addAdvice(advice) {
        this.advices.push(advice);
    }
}
/**
 * aop factory
 */
class AopFactory {
    /**
     * 添加切面
     */
    static addAspect(cfg) {
        if (this.aspects.has(cfg.instance)) {
            throw new errorfactory_1.NoomiError("2005", cfg.instance);
        }
        //连接点
        if (Array.isArray(cfg.advices)) {
            cfg.advices.forEach((item) => {
                if (!this.pointcuts.has(item.pointcut_id)) {
                    throw new errorfactory_1.NoomiError("2002", item.pointcut_id);
                }
                //设置实例或实例名
                item.instance = cfg.instance;
                //添加到pointcut的aop数组(是否需要重复检测，待考虑)
                this.addAdvice(item);
            });
        }
        this.aspects.set(cfg.instance, cfg);
    }
    /**
     * 添加切点
     * @param id            切点id
     * @param expressions   方法匹配表达式数组
     * @param proxyClass    特定代理类
     */
    static addPointcut(id, expressions, proxyClass) {
        //切点
        if (this.pointcuts.has(id)) {
            throw new errorfactory_1.NoomiError("2003", id);
        }
        this.pointcuts.set(id, new AopPointcut(id, expressions, proxyClass));
        //延迟处理method aop代理，避免某些实例尚未加载，只加一次
        if (this.needToUpdateProxy) {
            setImmediate(() => {
                AopFactory.updMethodProxy.call(AopFactory);
                this.needToUpdateProxy = true;
            });
            this.needToUpdateProxy = false;
        }
    }
    /**
     * 为pointcut添加expression
     * @param pointcutId    切点id
     * @param expression    表达式或数组
     */
    static addExpression(pointcutId, expression) {
        if (!this.pointcuts.has(pointcutId)) {
            throw new errorfactory_1.NoomiError("2002", pointcutId);
        }
        let pc = this.pointcuts.get(pointcutId);
        if (!Array.isArray(expression)) {
            let reg = util_1.Util.toReg(expression);
            pc.expressions.push(reg);
            //加入代理
            this.addProxyByExpression(reg);
        }
        else {
            expression.forEach(item => {
                let reg = util_1.Util.toReg(item);
                pc.expressions.push(reg);
                //加入代理
                this.addProxyByExpression(reg);
            });
        }
    }
    /**
     * 添加通知
     * @param advice 通知配置
     */
    static addAdvice(advice) {
        let pc = AopFactory.getPointcutById(advice.pointcut_id);
        if (!pc) {
            throw new errorfactory_1.NoomiError("2002", advice.pointcut_id);
        }
        pc.addAdvice(advice);
    }
    /**
     * 解析文件
     * @param path  文件路径
     */
    static parseFile(path) {
        //读取文件
        let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
        let json = null;
        try {
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2000") + '\n' + e;
        }
        this.init(json);
    }
    /**
     * 初始化
     * @param config
     */
    static init(config) {
        //切点数组
        if (Array.isArray(config.pointcuts)) {
            config.pointcuts.forEach((item) => {
                this.addPointcut(item.id, item.expressions);
            });
        }
        //切面数组
        if (Array.isArray(config.aspects)) {
            config.aspects.forEach((item) => {
                this.addAspect(item);
            });
        }
    }
    /**
     * 更新aop匹配的方法代理，为所有aop匹配的方法设置代理
     */
    static updMethodProxy() {
        if (!this.pointcuts || this.pointcuts.size === 0) {
            return;
        }
        //遍历instance factory设置aop代理
        let insFac = instancefactory_1.InstanceFactory.getFactory();
        //处理过的实例名数组
        let instances = [];
        //遍历pointcut
        let pc;
        for (pc of this.pointcuts.values()) {
            let reg;
            //遍历expression
            for (reg of pc.expressions) {
                this.addProxyByExpression(reg, instances);
            }
        }
    }
    /**
     * 通过正则式给方法加代理
     * @param expr          表达式正则式
     * @param instances     处理过的instance name
     */
    static addProxyByExpression(expr, instances) {
        //遍历instance factory设置aop代理
        let insFac = instancefactory_1.InstanceFactory.getFactory();
        for (let insName of insFac.keys()) {
            //该实例处理过，不再处理
            if (instances && instances.includes(insName)) {
                continue;
            }
            //先检测instanceName
            let instance = instancefactory_1.InstanceFactory.getInstance(insName);
            if (instance) {
                Object.getOwnPropertyNames(instance.__proto__).forEach(key => {
                    //给方法设置代理，constructor 不需要代理
                    if (key === 'constructor' || typeof (instance[key]) !== 'function') {
                        return;
                    }
                    //实例名+方法符合aop正则表达式
                    if (expr.test(insName + '.' + key)) {
                        instance[key] = aopproxy_1.AopProxy.invoke(insName, key, instance[key], instance);
                        if (instances) {
                            instances.push(insName);
                        }
                    }
                });
            }
        }
    }
    /**
     * 获取切点
     * @param instanceName  实例名
     * @param methodName    方法名
     * @return              pointcut array
     */
    static getPointcut(instanceName, methodName) {
        // 遍历iterator
        let a = [];
        for (let p of this.pointcuts.values()) {
            if (p.match(instanceName, methodName)) {
                a.push(p);
            }
        }
        return a;
    }
    /**
     * 根据id获取切点
     * @param pointcutId    pointcut id
     * @return              pointcut
     */
    static getPointcutById(pointcutId) {
        return this.pointcuts.get(pointcutId);
    }
    /**
     * 获取advices
     * @param instanceName  实例名
     * @param methodName    方法名
     * @return              {
     *                          before:[{instance:切面实例,method:切面方法},...]
     *                          after:[{instance:切面实例,method:切面方法},...]
     *                          return:[{instance:切面实例,method:切面方法},...]
     *                          throw:[{instance:切面实例,method:切面方法},...]
     *                      }
     */
    static getAdvices(instanceName, methodName) {
        let pointcuts = this.getPointcut(instanceName, methodName);
        if (pointcuts.length === 0) {
            return null;
        }
        let beforeArr = [];
        let afterArr = [];
        let throwArr = [];
        let returnArr = [];
        let pointcut;
        let hasTransaction = false;
        for (pointcut of pointcuts) {
            if (pointcut.id === transactionmanager_1.TransactionManager.pointcutId) {
                hasTransaction = true;
                continue;
            }
            pointcut.advices.forEach(aop => {
                let ins = typeof aop.instance === 'string' ?
                    instancefactory_1.InstanceFactory.getInstance(aop.instance) : aop.instance;
                switch (aop.type) {
                    case 'before':
                        beforeArr.push({
                            instance: ins,
                            method: aop.method
                        });
                        return;
                    case 'after':
                        afterArr.push({
                            instance: ins,
                            method: aop.method
                        });
                        return;
                    case 'around':
                        beforeArr.push({
                            instance: ins,
                            method: aop.method
                        });
                        afterArr.push({
                            instance: ins,
                            method: aop.method
                        });
                        return;
                    case 'after-return':
                        returnArr.push({
                            instance: ins,
                            method: aop.method
                        });
                        return;
                    case 'after-throw':
                        throwArr.push({
                            instance: ins,
                            method: aop.method
                        });
                }
            });
        }
        return {
            hasTransaction: hasTransaction,
            before: beforeArr,
            after: afterArr,
            throw: throwArr,
            return: returnArr
        };
    }
}
exports.AopFactory = AopFactory;
AopFactory.aspects = new Map();
AopFactory.pointcuts = new Map();
//是否需要开启更新proxy
AopFactory.needToUpdateProxy = true;
//# sourceMappingURL=aopfactory.js.map