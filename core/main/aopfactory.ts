import { InstanceFactory } from "./instancefactory";
import { AopProxy } from "./aopproxy";
import { NoomiError } from "../tools/errorfactory";
import { TransactionManager } from "../database/transactionmanager";
import { Util } from "../tools/util";

/**
 * Aop通知类型
 */
interface IAopAdvice{
    /**
     * 切点
     */
    pointcutId?:string;

    /**
     * 实例名或实例对象
     */
    instance?:any;

    /**
     * 类名
     */
    className?:string;

    /**
     * 通知类型 (before,after,after-return,after-throw,around)
     */
    type:string;
    /**
     * 对应的切面方法
     */
    method:string;
}

/**
 * Aop切面类型
 */
interface IAopAspect{
    /**
     * 实例名
     */
    instance?:string;
    /** 
     * 切点数组 
     */
    pointcuts:Array<AopPointcut>;
    /** 
     * 通知数组
     */
    advices:Array<IAopAdvice>;
}

/** 
 * 切点数据对象
 */
interface IPointcut{
    /**
     * 类名
     */
    className:string;
    /**
     * 切点id
     */
    id:string;
    /**
     * 表达式串
     */
    expressions?:Array<string>;
}

/**
 * @exclude
 * aop文件配置对象
 */
interface IAopCfg{
    files:Array<string>;            //引入文件
    pointcuts:Array<IPointcut>;     //切点集合
    aspects:Array<IAopAspect>;      //切面集合
}

 /**
  * aop 切点类
  */
class AopPointcut{
    /**
     * 切点id
     */
    id:string;

    /**
     * 表达式数组（正则表达式）
     */
    expressions:Array<RegExp> = [];

    /**
     * 通知数组
     */
    advices:Array<IAopAdvice> = [];

    /**
     * 构造器
     * @param id            切点id(唯一) 
     * @param expressions   该切点对应的表达式数组，表达式为正则表达式串
     */
    constructor(id:string,expressions:Array<string>){
        this.id = id;
        if(expressions){
            this.addExpression(expressions);    
        }
    }

    /**
     * 匹配方法是否满足表达式
     * @param instanceName  实例名
     * @param methodName    待检测方法 
     * @returns             匹配返回true，否则返回false
     */
    match(instanceName:string,methodName:string):boolean{
        for(let exp of this.expressions){
            if(exp.test(instanceName + '.' + methodName)){
                return true;
            }
        }
        return false;
    }

    /**
     * 给切点添加通知
     * @param advice    通知对象
     */
    addAdvice(advice:IAopAdvice):void{
        this.advices.push(advice);
    }

    /**
     * 添加表达式串
     * @param expr  表达式串或数组
     */
    addExpression(expr:string|string[]){
        if(!Array.isArray(expr)){
            expr = [expr];
        }
        
        expr.forEach((item)=>{
            if(typeof item !== 'string'){
                throw new NoomiError("2001");
            }
            this.expressions.push(Util.toReg(item));
        });
    }
}

/**
 * Aop工厂
 * 用于管理所有切面、切点
 */
class AopFactory{
    /**
     * 切面map，用于存储所有切面
     */
    static aspects:Map<string,IAopAspect> = new Map();
    /**
     * 切点map，用于存储所有切点
     */
    static pointcuts:Map<string,AopPointcut> = new Map();
    
    /**
     * 已代理方法map，键为instanctName.methodName，避免重复代理
     * @since 0.4.4
     */
    static proxyMethodMap:Map<string,boolean> = new Map();

    /**
     * 注册切面map，键为className,值为
     *          {
     *              isAspect:true,  //避免用了pointcut，但是未使用Aspect注解
     *              pointCutId1:{expressions:Array<string>,advices:{type:类型,method:方法名}},
     *              ...
     *          }
     */
    private static registAspectMap:Map<string,any> = new Map();

    /**
     * 注册切面
     * @param className     切面类名
     * @since 1.0.0
     */
    public static registAspect(className:string){
        if(!this.registAspectMap.has(className)){
            return;
        }
        this.registAspectMap.get(className).isAspect = true;
    }
    /**
     * 注册切点
     * @param cfg   pointcut配置
     * @since 1.0.0
     */
    public static registPointcut(cfg:IPointcut){
        let pc = this.getRegistPointcut(cfg.className,cfg.id,true);
        if(cfg.expressions){
            pc.expressions = pc.expressions.concat(cfg.expressions);
        }
    }

    /**
     * 注册advice
     * @param cfg   advice配置 
     * @since 1.0.0
     */
    public static registAdvice(cfg:IAopAdvice){
        if(!this.registAspectMap.has(cfg.className)){
            return;
        }
        let pc = this.registAspectMap.get(cfg.className)[cfg.pointcutId];
        if(!pc){
            return;
        }
        delete cfg.className;
        pc.advices.push(cfg);
    }

    /**
     * 从registAspectMap中获取注册的pointcut配置
     * @param className     类名
     * @param pointcutId    切点id
     * @param create        如果不存在，是否创建，如果为true，则创建，默认false
     * @returns             pointcut配置项
     * @since 1.0.0
     */
    private static getRegistPointcut(className:string,pointcutId:string,create?:boolean):any{
        let pc;
        if(this.registAspectMap.has(className)){
            let obj = this.registAspectMap.get(className);
            pc = obj[pointcutId];
        }else if(create){
            this.registAspectMap.set(className,{});
        }
        if(!pc && create){  //新建pointcut配置项
            let obj = this.registAspectMap.get(className);
            pc = {
                advices:[],
                expressions:[]
            };
            obj[pointcutId] = pc;
        }
        return pc;
    }
    /**
     * 处理实例切面
     * 把注册的切面添加到切面列表
     * @param instanceName  实例名
     * @param className     类名
     * @since 1.0.0
     */
    public static handleInstanceAspect(instanceName:string,className:string){
        if(!this.registAspectMap.has(className)){
            return;
        }
        let cfg = this.registAspectMap.get(className);
        if(!cfg.isAspect){  //非aspect，不处理
            return;
        }
        delete cfg.isAspect;
        Object.keys(cfg).forEach(item=>{
            let o = cfg[item];
            //新建pointcut
            let pc = new AopPointcut(item,o.expressions);
            //加入切点集
            this.pointcuts.set(item,pc);
            //为切点添加advice
            o.advices.forEach(item1=>{
                //设置实例或实例名
                item1.instance = instanceName;
                //添加advice
                pc.addAdvice(item1);
            });
        });
        this.aspects.set(instanceName,cfg);
        //删除已处理的class
        this.registAspectMap.delete(className);
    }

    /**
     * 为切点添加表达式
     * @param className     切点类名
     * @param pointcutId    切点id
     * @param expression    表达式或数组
     */
    public static addExpression(className:string,pointcutId:string,expression:string|Array<string>){
        // let pc = this.getRegistPointcut(className,pointcutId,true);
        let pc = this.pointcuts.get(pointcutId);
        if(!pc){
            return;
        }
        pc.addExpression(expression);
    }

    /**
     * 更新aop匹配的方法代理，为所有aop匹配的方法设置代理
     */
    public static updMethodProxy(){
        if(!this.pointcuts || this.pointcuts.size === 0){
            return;
        }
        //遍历pointcut
        let pc:AopPointcut;

        for(pc of this.pointcuts.values()){
            let reg:RegExp;
            //遍历expression
            for(reg of pc.expressions){
                this.addProxyByExpression(reg);
            }
        }
    }

    /**
     * 通过正则式给方法加代理
     * @param expr          表达式正则式
     */
    private static addProxyByExpression(expr:RegExp){
        //遍历instance factory设置aop代理
        let insFac = InstanceFactory.getFactory();
        for(let insName of insFac.keys()){
            //先检测instanceName
            let instance = InstanceFactory.getInstance(insName);
            if(instance){
                Object.getOwnPropertyNames(instance.__proto__).forEach(key=>{
                    //给方法设置代理，constructor 不需要代理
                    if(key === 'constructor' || typeof(instance[key]) !== 'function'){
                        return;
                    }
                    let method:string = insName + '.' + key;
                    //已代理过，不再代理
                    if(this.proxyMethodMap.has(method)){
                        return;
                    }
                    
                    //实例名+方法符合aop正则表达式
                    if(expr.test(method)){
                        instance[key] = AopProxy.invoke(insName,key,instance[key],instance);
                        this.proxyMethodMap.set(method,true);
                    }
                });
            }
        }
    }
    /**
     * 获取切点
     * @param instanceName  实例名 
     * @param methodName    方法名
     * @returns             切点数组
     */
    public static getPointcut(instanceName:string,methodName:string):Array<AopPointcut>{
        // 遍历iterator
        let a:Array<AopPointcut> = [];
    
        for(let p of this.pointcuts.values()){
            if(p.match(instanceName,methodName)){
                a.push(p); 
            }
        }
        return a;
    }
    

    /**
     * 根据id获取切点
     * @param pointcutId    切点id
     * @returns             切点对象
     */
    public static getPointcutById(pointcutId:string):AopPointcut{
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
    public static getAdvices(instanceName:string,methodName:string):object{
        let pointcuts:Array<AopPointcut> = this.getPointcut(instanceName,methodName);
        if(pointcuts.length === 0){
            return null;
        }
        
        let beforeArr:Array<object> = [];
        let afterArr:Array<object> = [];
        let throwArr:Array<object> = [];
        let returnArr:Array<object> = [];

        let pointcut:AopPointcut;
        let hasTransaction:boolean = false;
        for(pointcut of pointcuts){
            if(pointcut.id === TransactionManager.pointcutId){
                hasTransaction = true;
                continue;
            }
            pointcut.advices.forEach(aop=>{
                let ins:any = typeof aop.instance === 'string'?
                    InstanceFactory.getInstance(aop.instance):aop.instance;
                
                switch(aop.type){
                    case 'before':
                        beforeArr.push({
                            instance:ins,
                            method:aop.method
                        });
                        return;
                    case 'after':
                        afterArr.push({
                            instance:ins,
                            method:aop.method
                        });
                        return;
                    case 'around':
                        beforeArr.push({
                            instance:ins,
                            method:aop.method
                        });
                        afterArr.push({
                            instance:ins,
                            method:aop.method
                        });
                        return;
                    case 'after-return':
                        returnArr.push({
                            instance:ins,
                            method:aop.method
                        });
                        return;
                    case 'after-throw':
                        throwArr.push({
                            instance:ins,
                            method:aop.method
                        });
                }
            });
        }
        
        return {
            hasTransaction:hasTransaction,
            before:beforeArr,
            after:afterArr,
            throw:throwArr,
            return:returnArr
        }
    }

}

export{AopFactory,IAopAdvice,IAopAspect,AopPointcut,IAopCfg,IPointcut};