import { NoomiError } from "../tools/errorfactory";
import { StaticResource } from "../web/staticresource";
import { Util } from "../tools/util";
import { App } from "../tools/application";

/**
 * 实例工厂
 */

/**
 * 实例属性
 */
interface InstanceProperty{
    name:string;    //属性名
    ref:string;     //引用实例名
}

interface InstanceJSON{
    module_path:any;            //模块基础路径(数组或单个字符串)
    files:Array<string>;        //引入文件
    instances:Array<any>;       //实例配置数组
}

/**
 * 实例配置
 */
interface InstanceCfg{
    name:string;                            //实例名
    class?:any;                             //类名或类
    path?:string;                           //模块路径（相对noomi.ini配置的modulepath），与instance二选一
    instance?:any;                          //实例与path 二选一
    singleton?:boolean;                     //单例模式
    params?:Array<any>;                     //参数列表
    properties?:Array<InstanceProperty>;    //属性列表
}

/**
 * 实例对象
 */
interface InstanceObj{
    instance?:any;                          //实例对象
    class?:any;                             //类引用
    singleton:boolean;                      //单例标志
    params?:Array<any>;                     //构造器参数
    properties?:Array<InstanceProperty>;    //属性列表
}

class InstanceFactory{
    static factory:any = new Map();
    static mdlBasePath:Array<string> = [];
    static injectList:Array<any> = [];

    static init(config:any){
        if(typeof config === 'object'){
            this.handleJson(config);
        }else{
            this.parseFile(config);
        }
        
        //延迟注入
        process.nextTick(()=>{
            InstanceFactory.finishInject();
        });
    }
    /**
     * 添加单例到工厂
     * @param cfg 实例配置
     */
    static addInstance(cfg:InstanceCfg):any{
        if(this.factory.has(cfg.name)){
            console.log(new NoomiError("1002",cfg.name));
            return;
        }
        
        let insObj:InstanceObj;
        let path:string;
        //单例模式，默认true
        let singleton = cfg.singleton!==undefined?cfg.singleton:true;
        let mdl:any;
        //从路径加载模块
        if(cfg.path && typeof cfg.path === 'string' && (path=cfg.path.trim()) !== ''){  
            for(let mdlPath of this.mdlBasePath){
                mdl = require(App.path.posix.join(process.cwd(),mdlPath,path));
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
     * 添加inject
     * @param instance      实例对象 
     * @param propName      属性名
     * @param injectName    注入的实例名
     * 
     */
    static addInject(instance:any,propName:string,injectName:string):void{
        let inj = InstanceFactory.getInstance(injectName);
        if(inj){
            instance[propName] = inj;
        }else{
            this.injectList.push({
                instance:instance,
                propName:propName,
                injectName:injectName
            });
        }
    }

    /**
     * 完成注入列表的注入操作
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
     * @return      实例化的对象  
     */
    static getInstance(name:string,param?:Array<any>):any{
        let ins:InstanceObj = this.factory.get(name);
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
     * @return          实例化的对象  
     */
    static getInstanceByClass(clazz:any,param?:Array<any>):any{
        let ins:InstanceObj;
        for(let ins of this.factory.keys()){
            if(ins.class === clazz){
                ins = this.factory.get(ins);
            }
        }
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
     * 获取instance object
     * @param name instance name
     */
    static getInstanceObj(name:string):InstanceObj{
        return this.factory.get(name);
    }

    /**
     * 执行方法
     * @param instancee     实例名或实例对象 
     * @param methodName    方法名
     * @param params        参数数组
     * @param func          方法(与methodName二选一)
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
     * 解析实例配置文件
     * @param path      文件路径
     */
    static parseFile(path:string){
        //读取文件
        let jsonStr:string = App.fs.readFileSync(App.path.posix.join(process.cwd(),path),'utf-8');
        let json:InstanceJSON = null;

        try{
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("1000") + '\n' + e;
        }
        this.handleJson(json);
    }

    /**
     * 处理配置对象
     * @param json      inistance object
     */
    private static handleJson(json:InstanceJSON){
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
                this.parseFile(App.path.posix.resolve(App.configPath,item));
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
     * 添加实例(从路径添加)
     * @param path 
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
     */
    static getFactory(){
        return this.factory;
    }
}

export {InstanceFactory};
