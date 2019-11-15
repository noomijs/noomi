import { InstanceFactory } from "./instancefactory";
import { AopProxy } from "./aopproxy";
import { NoomiError } from "../tools/errorfactory";
import { TransactionManager } from "../database/transactionmanager";
import { Util } from "../tools/util";
import { App } from "../tools/application";

/**
 * AOP 工厂
 */

/**
 * 通知
 */
interface AopAdvice{
    //切点
    pointcut_id?:string;
    //类型 (before,after,return,throw,around)
    type:string;
    //切面对应的方法
    method:string;
    //切面对应的实例名或实例对象
    instance:any; 
}

/**
 * 切面
 */
interface AopAspect{
    instance:string;
    //切点
    pointcuts:Array<AopPointcut>;
    //通知
    advices:Array<AopAdvice>;
}

//切点json数据
interface PointcutJson{
    id:string;
    expressions:Array<string>;
}
//数据json
interface DataJson{
    files:Array<string>;            //引入文件
    pointcuts:Array<PointcutJson>;   //切点
    aspects:Array<AopAspect>;       //切面
}

 /**
  * aop 切点
  */
class AopPointcut{
    id:string;
    proxyClass:any;             //代理类
    //表达式数组（正则表达式）
    expressions:Array<RegExp> = [];
    advices:Array<AopAdvice> = [];

    constructor(id:string,expressions:Array<string>,proxyClass?:any){
        this.id = id;
        this.proxyClass = proxyClass || AopProxy;
        if(!expressions){
            throw new NoomiError("2001");
        }

        if(!Array.isArray(expressions)){
            expressions = [expressions];
        }
        
        expressions.forEach((item)=>{
            if(typeof item !== 'string'){
                throw new NoomiError("2001");
            }
            this.expressions.push(Util.toReg(item));
        });
    }

    /**
     * 匹配方法是否满足表达式
     * @param instanceName  实例名
     * @param methodName    待检测方法 
     * @return              true/false
     */
    match(instanceName:string,methodName:string):boolean{
        for(let i=0;i<this.expressions.length;i++){
            if(this.expressions[i].test(instanceName + '.' + methodName)){
                return true;
            }
        }
        return false;
    }

    
    /**
     * 给切点添加通知
     * @param advice 
     */
    addAdvice(advice:AopAdvice){
        this.advices.push(advice);
    }
}

/**
 * aop factory
 */
class AopFactory{
    static aspects:any = new Map();
    static pointcuts:any = new Map();
    //是否需要开启更新proxy
    static needToUpdateProxy:boolean = true;
    /**
     * 添加切面
     */
    static addAspect(cfg:AopAspect):void{
        if(this.aspects.has(cfg.instance)){
            throw new NoomiError("2005",cfg.instance); 
        }
        //连接点
        if(Array.isArray(cfg.advices)){
            cfg.advices.forEach((item)=>{
                if(!this.pointcuts.has(item.pointcut_id)){
                    throw new NoomiError("2002",item.pointcut_id);
                }

                //设置实例或实例名
                item.instance = cfg.instance;
                //添加到pointcut的aop数组(是否需要重复检测，待考虑)
                this.addAdvice(item);
            });
        }
        this.aspects.set(cfg.instance,cfg);
    }

    /**
     * 添加切点
     * @param id            切点id 
     * @param expressions   方法匹配表达式数组
     * @param proxyClass    特定代理类
     */
    static addPointcut(id:string,expressions:Array<string>,proxyClass?:any):void{
        //切点
        if(this.pointcuts.has(id)){
            throw new NoomiError("2003",id);
        }
        this.pointcuts.set(id,new AopPointcut(id,expressions,proxyClass));
        //延迟处理method aop代理，避免某些实例尚未加载，只加一次
        if(this.needToUpdateProxy){
            setImmediate(()=>{
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
    static addExpression(pointcutId:string,expression:string|Array<string>){
        if(!this.pointcuts.has(pointcutId)){
            throw new NoomiError("2002",pointcutId);
        }
        let pc:AopPointcut = this.pointcuts.get(pointcutId);
        if(!Array.isArray(expression)){
            let reg:RegExp = Util.toReg(expression);
            pc.expressions.push(reg);
            //加入代理
            this.addProxyByExpression(reg);
        }else{
            expression.forEach(item=>{
                let reg:RegExp = Util.toReg(item);
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
    static addAdvice(advice:AopAdvice):void{
        let pc:AopPointcut = AopFactory.getPointcutById(advice.pointcut_id);
        if(!pc){
            throw new NoomiError("2002",advice.pointcut_id);
        }
        pc.addAdvice(advice);
    }

    /**
     * 解析文件
     * @param path  文件路径 
     */
    static parseFile(path:string):void{
        
        //读取文件
        let jsonStr:string = App.fs.readFileSync(App.path.posix.join(process.cwd(),path),'utf-8');
        let json:DataJson = null;
        try{
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2000") + '\n' + e;
        }

        this.init(json);
    }

    /**
     * 初始化
     * @param config 
     */
    static init(config){
        //切点数组
        if(Array.isArray(config.pointcuts)){
            config.pointcuts.forEach((item:PointcutJson)=>{
                this.addPointcut(item.id,item.expressions);
            });
        }

        //切面数组
        if(Array.isArray(config.aspects)){
            config.aspects.forEach((item:AopAspect)=>{
                this.addAspect(item);
            });
        }
    }

    /**
     * 更新aop匹配的方法代理，为所有aop匹配的方法设置代理
     */
    static updMethodProxy():void{
        if(!this.pointcuts || this.pointcuts.size === 0){
            return;
        }
        //遍历instance factory设置aop代理
        let insFac = InstanceFactory.getFactory();
        //处理过的实例名数组
        let instances:Array<string> = [];
        //遍历pointcut
        let pc:AopPointcut;
        for(pc of this.pointcuts.values()){
            let reg:RegExp;
            //遍历expression
            for(reg of pc.expressions){
                this.addProxyByExpression(reg,instances);
            }
        }
    }

    /**
     * 通过正则式给方法加代理
     * @param expr          表达式正则式
     * @param instances     处理过的instance name
     */
    static addProxyByExpression(expr:RegExp,instances?:Array<string>){
        //遍历instance factory设置aop代理
        let insFac = InstanceFactory.getFactory();
        for(let insName of insFac.keys()){
            //该实例处理过，不再处理
            if(instances && instances.includes(insName)){
                continue;
            }
            //先检测instanceName
            let instance = InstanceFactory.getInstance(insName);
            if(instance){
                Object.getOwnPropertyNames(instance.__proto__).forEach(key=>{
                    //给方法设置代理，constructor 不需要代理
                    if(key === 'constructor' || typeof(instance[key]) !== 'function'){
                        return;
                    }
                    //实例名+方法符合aop正则表达式
                    if(expr.test(insName + '.' + key)){
                        instance[key] = AopProxy.invoke(insName,key,instance[key],instance);
                        if(instances){
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
    static getPointcut(instanceName:string,methodName:string):Array<AopPointcut>{
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
     * @param pointcutId    pointcut id
     * @return              pointcut
     */
    static getPointcutById(pointcutId:string):AopPointcut{
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
    static getAdvices(instanceName:string,methodName:string):object{
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

export{AopFactory};