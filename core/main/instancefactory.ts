import { NoomiError } from "../tools/errorfactory";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { AopFactory} from "./aopfactory";

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
    singleton?:boolean;
    /**
     * 构造器参数
     */
    params?:Array<any>;
    /**
     * 需要注入的属性列表
     */
    properties?:Map<string,any>;
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
     * key：类
     */
    public static factory:Map<any,IInstance> = new Map();
    
    /**
     * 工厂初始化
     * @param config    配置项
     */
    public static async init(config:any){
        await this.parse(config);
        AopFactory.proxyAll();
    }
    /**
     * 添加单例到工厂
     * @param cfg       实例配置对象
     */
    public static addInstance(clazz:any,cfg?:IInstanceCfg):any{
        if(!this.factory.has(clazz)){  //新建
            this.factory.set(clazz,{singleton:true});
        }
        //参数赋值
        if(cfg){
            let cfg1 = this.factory.get(clazz);
            cfg1.singleton = cfg.singleton!==false;
            cfg1.params = cfg.params;
            cfg1.instance = cfg.instance;
        }
    }

    /**
     * 注入
     * @param targetClass       目标类
     * @param propName          目标属性名
     * @param injectClass       注入类
     */
    public static inject(targetClass:any,propName:string,injectClass:any){
        if(!this.factory.has(targetClass)){
            this.factory.set(targetClass,{
                properties:new Map()
            });
        }
        let cfg = this.factory.get(targetClass);
        if(!cfg.properties){
            cfg.properties = new Map()
        }
        cfg.properties.set(propName,injectClass);
    }

    /**
     * 获取实例
     * @param name  实例名
     * @param param 参数数组
     * @returns     实例化的对象或null
     */
    public static getInstance(clazz:any,param?:Array<any>):any{
        let ins:IInstance = this.factory.get(clazz);
        if(!ins){
            return null;
        }
        if(ins.singleton && ins.instance) {
            return ins.instance;
        }else {
            param = param || ins.params || [];
            let instance = Reflect.construct(clazz,param); 
            if(ins.singleton){
                ins.instance = instance;
            }
            if(ins.properties){
                for(let k of ins.properties){
                    instance[k[0]] = this.getInstance(k[1]);
                }
            }
            return instance;
        }
    }

    /**
     * 获取实例配置对象
     * @param clazz  实例名
     * @returns             实例配置对象
     */
    public static getInstanceCfg(clazz:any):IInstance{
        return this.factory.get(clazz);
    }

    /**
     * 执行实例的一个方法
     * @param instance     实例类或实例对象 
     * @param methodName    方法名
     * @param params        参数数组
     * @param func          方法(与methodName二选一)
     * @returns             方法对应的结果
     */
    public static exec(instance:any,methodName:string,params:Array<any>,func?:Function):any{
        //instance是类
        let instanceName = '';
        if(instance && typeof(instance)==='function') {
            instanceName = instance.name;
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
    private static parse(path:string|string[]){
        if(Array.isArray(path)){
            for(let p of path){
                handle(p);
            }
        }else{
            handle(path);
        }

        /**
         * 处理instance路径
         * @param path  待解析路径
         */
        function handle(path:string){
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
                    handleDir(pa.join('/'),pathArr[pathArr.length-1],true);
                }
            }
            if(!handled){
                handleDir(pa.join('/'),pathArr[pathArr.length-1]);
            }

            /**
             * 处理子目录
             * @param dirPath   目录地址
             * @param fileExt   文件后缀
             * @param deep      是否深度处理
             */
            function handleDir(dirPath:string,fileExt:string,deep?:boolean){
                const dir = App.fs.readdirSync(dirPath,{withFileTypes:true});
                let fn:string = fileExt;
                let reg:RegExp = Util.toReg(fn,3);
                for (const dirent of dir) {
                    if(dirent.isDirectory()){
                        if(deep){
                            handleDir(App.path.resolve(dirPath ,dirent.name),fileExt,deep);
                        }
                    }else if(dirent.isFile()){
                        // @Instance注解方式文件，自动执行instance创建操作
                        if(reg.test(dirent.name)){
                            // require(App.path.resolve(dirPath , dirent.name));
                            import(App.path.resolve(dirPath , dirent.name));
                        }
                    }
                }
            }
        }
    }
    
    /**
     * 类是否已添加到工厂
     * @param clazz     类对象
     * @returns         true/false
     */
    public static hasClass(clazz:any):boolean{
        return this.factory.has(clazz);
    }
    /**
     * 获取instance工厂
     * @returns     实例工厂
     */
    public static getFactory():Map<any,IInstance>{
        return this.factory;
    }
}