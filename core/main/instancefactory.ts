import { NoomiError } from "../tools/errorfactory";
import { StaticResource } from "../web/staticresource";
import { Util } from "../tools/util";
import { App } from "../tools/application";

/**
 * 实例属性
 */
interface IInstanceProperty{
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
 * @exclude
 * 实例文件配置对象
 */
interface IInstanceFileCfg{
    module_path:any;            //模块基础路径(数组或单个字符串)
    files:Array<string>;        //引入文件
    instances:Array<any>;       //实例配置数组
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
interface IInstance{
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
interface IInject{
    /**
     * 待注入实例
     */
    instance:any,
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
class InstanceFactory{
    /**
     * 实例工厂map，存放所有实例对象
     */
    static factory:Map<string,IInstance> = new Map();
    /**
     * 模块基础路径数组，加载实例时从该路径加载
     */
    static mdlBasePath:Array<string> = [];
    /**
     * 待注入对象数组
     */
    static injectList:Array<IInject> = [];

    /**
     * 初始化后操作数组(实例工厂初始化结束后执行) {func:Function,thisObj:func this指向}
     * @since 0.4.0
     */
    static afterInitOperations:Array<object> = [];
    /**
     * 工厂初始化
     * @param config    配置项
     */
    static init(config:any){
        if(typeof config === 'object'){
            this.handleJson(config);
        }else{
            this.parseFile(config);
        }
        
        //执行后处理
        this.doAfterInitOperations();
    }
    /**
     * 添加单例到工厂
     * @param cfg   实例配置对象
     * @returns     undefined或添加的实例
     */
    static addInstance(cfg:IInstanceCfg):any{
        if(this.factory.has(cfg.name)){
            console.log(new NoomiError("1002",cfg.name));
            return;
        }
        
        let insObj:IInstance;
        let path:string;
        //单例模式，默认true
        let singleton = cfg.singleton!==undefined?cfg.singleton:true;
        let mdl:any;
        //从路径加载模块
        if(cfg.path && typeof cfg.path === 'string' && (path=cfg.path.trim()) !== ''){  
            for(let mdlPath of this.mdlBasePath){
                mdl = require(Util.getAbsPath([mdlPath,path]));
                //支持ts和js,ts编译后为{className:***},js直接输出为class
                //找到则退出
                if(mdl){
                    if(typeof mdl === 'object'){
                        mdl = mdl[cfg.class];
                    }
                    // class
                    if(mdl.constructor !== Function){
                        throw new NoomiError("1003");
                    }
                    break;
                }
            }
        }else{
            mdl = cfg.class;
        }
        if(!mdl){
            throw new NoomiError("1004",path);
        }
        //增加实例名
        mdl.prototype.__instanceName = cfg.name;
        
        let instance:any;
        if(singleton){
            instance = cfg.instance||new mdl(cfg.params);
        }
        
        insObj={
            instance:instance,
            class:mdl,
            singleton:singleton,
            properties:cfg.properties,
        };

        this.factory.set(cfg.name,insObj);
        if(insObj.instance){
            //设置name
            //有实例，需要加入注入
            if(cfg.properties && cfg.properties.length>0){
                cfg.properties.forEach((item)=>{
                    this.addInject(insObj.instance,item.name,item.ref);
                });
            }
            return insObj.instance;
        }
    }

    /**
     * 为实例添加注入
     * @param instance      实例对象 
     * @param propName      属性名
     * @param injectName    注入的实例名
     */
    static addInject(instance:any,propName:string,injectName:string):void{
        this.injectList.push({
            instance:instance,
            propName:propName,
            injectName:injectName
        });
        //添加注入操作到初始化后处理
        this.addAfterInitOperation(this.finishInject,this);
    }

    /**
     * 完成注入操作
     */
    static finishInject():void{
        for(let item of this.injectList){
            let instance = InstanceFactory.getInstance(item.injectName);
            //实例不存在
            if(!instance){
                throw new NoomiError('1001',item.injectName);
            }
            Reflect.set(item.instance,item.propName,instance); 
        }
    }
    /**
     * 获取实例
     * @param name  实例名
     * @param param 参数数组
     * @returns     实例化的对象或null  
     */
    static getInstance(name:string,param?:Array<any>):any{
        let ins:IInstance = this.factory.get(name);
        if(!ins){
            return null;
        }
        if(ins.singleton){
            return ins.instance;
        }else{
            let mdl = ins.class;
            param = param || ins.params || [];
            // let instance = new mdl(param);
            let instance = Reflect.construct(mdl,param);
            
            //注入属性
            if(ins.properties && ins.properties.length>0){
                ins.properties.forEach((item)=>{
                    this.addInject(instance,item.name,item.ref);
                });
            }
            return instance;
        }
    }

    /**
     * 通过类获取实例
     * @param clazz     类
     * @param param     参数数组
     * @returns         实例  
     */
    static getInstanceByClass(clazz:any,param?:Array<any>):any{
        let insObj:IInstance;
        
        for(let ins of this.factory.values()){
            if(ins.class === clazz){
                insObj = ins;
                break;
            }
        }
        if(!insObj){
            return null;
        }
        
        if(insObj.singleton){
            return insObj.instance;
        }else{
            let mdl = insObj.class;
            param = param || insObj.params || [];
            //初始化instance
            let instance = Reflect.construct(mdl,param);
            //注入属性
            if(insObj.properties && insObj.properties.length>0){
                insObj.properties.forEach((item)=>{
                    this.addInject(instance,item.name,item.ref);
                });
            }
            return instance;
        }
    }

    /**
     * 获取实例对象
     * @param name  实例名
     * @returns     实例对象
     */
    static getInstanceObj(name:string):IInstance{
        return this.factory.get(name);
    }

    /**
     * 执行实例的一个方法
     * @param instancee     实例名或实例对象 
     * @param methodName    方法名
     * @param params        参数数组
     * @param func          方法(与methodName二选一)
     * @returns             方法对应的结果
     */
    static exec(instance:any,methodName:string,params:Array<any>,func?:Function):any{
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
     * 解析实例配置文件
     * @param path      文件路径
     */
    static parseFile(path:string){
        //读取文件
        let jsonStr:string = App.fs.readFileSync(path,'utf-8');
        let json:IInstanceFileCfg = null;

        try{
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("1000") + '\n' + e;
        }
        this.handleJson(json);
    }

    /**
     * @exclude
     * 处理配置对象
     * @param json      实例对象
     */
    private static handleJson(json:IInstanceFileCfg){
        if(json.module_path){
            if(Array.isArray(json.module_path)){
                json.module_path.forEach((item)=>{
                    if(!this.mdlBasePath.includes(item)){
                        //加入禁止访问路径
                        StaticResource.addPath(item.charAt(0) === '/'?item:'/' + item);
                        this.mdlBasePath.push(item);
                    }
                });
            }else if(typeof json.module_path === 'string'){
                if(!this.mdlBasePath.includes(json.module_path)){
                    let item = json.module_path;
                    //加入禁止访问路径
                    StaticResource.addPath(item === '/'?item:'/' + item);
                    this.mdlBasePath.push(item);
                }
            }
        }

        //子文件
        if(Array.isArray(json.files)){
            json.files.forEach((item)=>{
                this.parseFile(Util.getAbsPath([App.configPath,item]));
            });
        }

        //实例数组
        if(Array.isArray(json.instances)){
            json.instances.forEach((item)=>{
                if(typeof item === 'string'){ //模块在路径中
                    this.addInstances(item);
                }else{
                    this.addInstance(item);
                }
            });
        }
    }

    /**
     * 从文件添加实例
     * @param path  文件路径
     */
    static addInstances(path:string){
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

        function handleDir(dirPath:string,fileExt:string,deep?:boolean){
            const dir = App.fs.readdirSync(dirPath,{withFileTypes:true});
            
            let fn:string = fileExt;
            let reg:RegExp = Util.toReg(fn,3);
            
            for (const dirent of dir) {
                if(dirent.isDirectory()){
                    if(deep){
                        handleDir(dirPath + '/' + dirent.name,fileExt,deep);
                    }
                }else if(dirent.isFile()){
                    if(reg.test(dirent.name)){
                        require(dirPath + '/' + dirent.name);
                    }
                }            
            }
        }
    }
    /**
     * 获取instance工厂
     * @returns     实例工厂
     */
    static getFactory():Map<string,IInstance>{
        return this.factory;
    }

    /**
     * 添加初始化结束后操作
     * @param foo   待执行操作
     * @since 0.4.0
     */
    static addAfterInitOperation(foo:Function,thisObj:any){
        //已添加操作不再添加
        if(this.afterInitOperations.find(item=>item['func'] === foo)){
            return;
        }
        this.afterInitOperations.push({
            func:foo,
            thisObj:thisObj
        });
    }

    /**
     * 执行初始化操作
     * @since 0.4.0
     */
    static doAfterInitOperations(){
        for(let foo of this.afterInitOperations){
            foo['func'].apply(foo['thisObj']);
        }
    }
}

export {InstanceFactory,IInstance,IInstanceCfg,IInstanceProperty};
