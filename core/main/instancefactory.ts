import { NoomiError } from "../tools/errorfactory";
import { StaticResource } from "../web/staticresource";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { FileWatcher, EWatcherType } from "../tools/filewatcher";
import { TransactionManager } from "../database/transactionmanager";
import { FilterFactory } from "../web/filterfactory";
import { RouteFactory } from "./route/routefactory";
import { WebAfterHandler } from "../web/webafterhandler";
import { AopFactory, AopPointcut } from "./aopfactory";

/**
 * 实例属性
 */
export interface IInstanceProperty{
    /**
     * 属性名
     */
    name:string;
    /**
     * 引用实例名
     */
    ref:string;
}

/**
 * 实例配置对象
 */
interface IInstanceCfg{
    /**
     * 实例名
     */
    name:string;
    /**
     * 类名或类
     */
    class?:any;
    /**
     * 模块路径（相对noomi.ini配置的modulepath），与instance二选一
     */
    path?:string;
    /**
     * 实例与path 二选一
     */
    instance?:any;
    /**
     * 单例模式，如果为true，表示该类只创建一个实例，调用时，共享调用
     */
    singleton?:boolean;
    /**
     * 参数数组，初始化时需要传入的参数
     */
    params?:Array<any>;
    /**
     * 属性列表，定义需要注入的属性
     */
    properties?:Array<IInstanceProperty>;    
}

/**
 * 实例对象，实例工厂中的存储元素
 */
export interface IInstance{
    /**
     * 实例对象
     */
    instance?:any;
    /**
     * 类引用
     */
    class?:any;
    /**
     * 单例标志
     */
    singleton:boolean;
    /**
     * 构造器参数
     */
    params?:Array<any>;
    /**
     * 属性列表
     */
    properties?:Array<IInstanceProperty>;
}

/**
 * 注入参数对象，用于存储待注入对象的参数
 */
export interface IInject{
    /**
     * 待注入实例
     */
    instance?:any,

    /**
     * 待注入类
     */
    clazz?:any,

    /**
     * 待注入属性名
     */
    propName:string,
    /**
     * 注入实例名
     */
    injectName:string
}

/**
 * 实例工厂
 * @remarks
 * 用于管理所有的实例对象
 */
export class InstanceFactory{
    /**
     * 实例工厂map，存放所有实例对象
     */
    public static factory:Map<string,IInstance> = new Map();
    /**
     * 注入依赖map  键为注入类名，值为数组，数组元素为{className:类名,propName:属性名}
     * @since 0.4.4
     */
    private static injectMap:Map<string,object[]> = new Map();
    
    /**
     * 工厂初始化
     * @param config    配置项
     */
    public static async init(config:any){
        await this.parse(config);
    }
    /**
     * 添加单例到工厂
     * @param cfg       实例配置对象
     * @param replace   替换之前的实例
     * @returns         undefined或添加的实例
     */
    public static addInstance(cfg:IInstanceCfg):any{
        cfg.class.prototype.__instanceName = cfg.name;
        this.factory.set(cfg.name,{
            class:cfg.class,
            singleton:cfg.singleton!==false
        });

        
        //依赖实例名的相关处理
        AopFactory.handleInstanceAspect(cfg.name,cfg.class.name);
        RouteFactory.handleInstanceRoute(cfg.name,cfg.class.name);
        TransactionManager.handleInstanceTranstraction(cfg.name,cfg.class.name);
        FilterFactory.handleInstanceFilter(cfg.name,cfg.class.name);
        WebAfterHandler.handleInstanceHandler(cfg.name,cfg.class.name);
        
        //因为可能切面尚未添加到实例工厂，延迟aop代理
        setImmediate(()=>{
            AopFactory.clearProxy(cfg.class.prototype.__instanceName);
            AopFactory.proxyOne(cfg.class.prototype.__instanceName);
        });
    }

    /**
     * 注入
     * @param targetClassName   目标类名
     * @param propName          注入属性名
     * @param injectName        注入实例名
     */
    public static inject(targetClassName:any,propName:string,injectName:string){
        if(this.injectMap.has(targetClassName)){
            let arr = this.injectMap.get(targetClassName);
            //不重复注入，如果属性已注入，则修改注入名，否则增加到数组
            let r = arr.find(item=>item['propName'] === propName);
            if(r){
                r['injectName'] = injectName;
            }else{
                arr.push({propName:propName,injectName:injectName});
            }
        }else{
            this.injectMap.set(targetClassName,[{propName:propName,injectName:injectName}]);
        }
    }

    /**
     * 获取实例
     * @param name  实例名
     * @param param 参数数组
     * @returns     实例化的对象或null
     */
    public static getInstance(name:string,param?:Array<any>):any{
        let ins:IInstance = this.factory.get(name);
        if(!ins){
            return null;
        }
        if(ins.singleton&&ins.instance){
            if(this.injectMap.has(ins.class.name)){
                //重新注入
                this.injectMap.get(ins.class.name).forEach((item)=>{
                    ins.instance[item['propName']] = this.getInstance(item['injectName']);
                });
            }
            return ins.instance;
        }else{
            let mdl = ins.class;
            param = param || ins.params || [];
            let instance = Reflect.construct(mdl,param);
            if(this.injectMap.has(ins.class.name)){
                this.injectMap.get(ins.class.name).forEach((item)=>{
                    instance[item['propName']] = this.getInstance(item['injectName']);
                });
            }
            if(ins.singleton){
                ins.instance = instance;
            }
            return instance;
        }
    }

    /**
     * 获取实例配置对象
     * @param instanceName  实例名
     * @returns             实例配置对象
     */
    public static getInstanceCfg(instanceName:string):IInstance{
        return this.factory.get(instanceName);
    }

    /**
     * 执行实例的一个方法
     * @param instancee     实例名或实例对象 
     * @param methodName    方法名
     * @param params        参数数组
     * @param func          方法(与methodName二选一)
     * @returns             方法对应的结果
     */
    public static exec(instance:any,methodName:string,params:Array<any>,func?:Function):any{
        //实例名，需要得到实例对象
        let instanceName = '';
        if(instance && typeof instance === 'string'){
            instanceName = instance; 
            instance = this.getInstance(instance);
        }
        //实例不存在
        if(!instance){
            throw new NoomiError("1001",instanceName);
        }
        func = func || instance[methodName];
        //方法不存在
        if(!func){
            throw new NoomiError("1010",methodName);
        }
        return func.apply(instance,params); 
    }

    /**
     * @exclude
     * 处理配置对象
     * @param 
     */
    private static async parse(path:string|string[]){
        if(Array.isArray(path)){
            for(let p of path){
                await handle(p);
            }
        }else{
            await handle(path);
        }

        /**
         * 处理instance路径
         * @param path  待解析路径
         */
        async function handle(path:string){
            const basePath = process.cwd();
            let pathArr = path.split('/');
            let pa = [basePath];
            let handled:boolean = false;    //是否已处理
            for(let i=0;i<pathArr.length-1;i++){
                const p = pathArr[i];
                if(p.indexOf('*') === -1 && p !== ""){
                    pa.push(p);
                }else if(p === '**'){ //所有子孙目录
                    handled=true;
                    if(i<pathArr.length-2){
                        throw new NoomiError('1000');
                    }
                    await handleDir(pa.join('/'),pathArr[pathArr.length-1],true);
                }
            }
            if(!handled){
                await handleDir(pa.join('/'),pathArr[pathArr.length-1]);
            }

            /**
             * 处理子目录
             * @param dirPath   目录地址
             * @param fileExt   文件后缀
             * @param deep      是否深度处理
             */
            async function handleDir(dirPath:string,fileExt:string,deep?:boolean){
                const dir = App.fs.readdirSync(dirPath,{withFileTypes:true});
                let fn:string = fileExt;
                let reg:RegExp = Util.toReg(fn,3);
                //添加 file watcher
                if(App.openWatcher){
                    FileWatcher.addDir(dirPath,EWatcherType.DYNAMIC);
                }
                for (const dirent of dir) {
                    if(dirent.isDirectory()){
                        if(deep){
                            handleDir(App.path.resolve(dirPath ,dirent.name),fileExt,deep);
                        }
                    }else if(dirent.isFile()){
                        // @Instance注解方式文件，自动执行instance创建操作
                        if(reg.test(dirent.name)){
                            await import(App.path.resolve(dirPath , dirent.name));
                        }
                    }
                }
            }
        }
    }
    
    /**
     * 获取instance工厂
     * @returns     实例工厂
     */
    public static getFactory():Map<string,IInstance>{
        return this.factory;
    }
}