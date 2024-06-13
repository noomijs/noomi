import {NoomiError} from "../tools/noomierror";
import {Util} from "../tools/util";
import {App} from "../tools/application";
import {AopFactory} from "./aop/aopfactory";
import {RouteFactory} from "./route/routefactory";
import { UnknownClass } from "../types/other";
import { InstanceItem, InstanceOption } from "../types/instancetypes";


/**
 * 实例工厂
 * @remarks
 * 用于管理所有的实例对象
 */
export class InstanceFactory {
    /**
     * 实例工厂map
     * @remarks
     * 用于存放所有实例对象
     * 
     * key：类
     * 
     * value: 实例 
     */
    public static factory: Map<unknown, InstanceItem> = new Map();

    /**
     * 工厂初始化
     * @param config -    配置串
     * ```js
     * {
     * //模块基础路径(可选配置)，模块从该路径中加载，配置该路径后，模块路径采用相对路径配置，
     * // 注：该路径为js路径，而不是ts路径，相对于项目根目录
     * // "module_path":["/dist/test/app/module"],
     * //实例数组，两种配置方式，如果数组元素为字符串，则加载符合路径规则的所有模块，
     * //如果为对象，则单个加载模块
     * //所有模块必须为class
     * "instances":[
     *   //字符串模式，加载符合路径规则的js文件，该路径相对于项目根目录，
     *   //支持通配符*，**表示自己及所有子孙目录。
     *   //采用该方式，模块类必须用`@Instance或 @Router注解`
     *   `"/dist/test/app/module/**\/*.js",`
     *   //对象模式，加载单个模块
     *   {
     *       "name":"logAdvice", 			//实例名，不可重复，必填
     *       "class":"LogAdvice",			//类名，必填
     *       "path":"advice/logadvice",		//模块路径，相对于module_path中的路径，必填
     *       "singleton":true,				//是否单例，布尔型，默认true,
     *       "properties":[                  //注入对象
     *           {
     *               "name":"commonTool",    //属性名
     *               "ref":"commInstanceTool"//引用实例名
     *           }
     *       ]
     *   }
     * ],
     * 实例配置子路径(可选配置)，路径相对于初始的config路径(该路径在noomi初始化时传入，默认/config)
     * 当模块过多时，可采用该方式分路径配置，如：
     *  "files":["context/action.json"]
     * }
     * ```
     */
    public static async init(config: string) {
        await this.parse(config);
        RouteFactory.handleRegistedRouters();
        AopFactory.proxyAll();
    }

    /**
     * 添加单例到工厂
     * @param clazz -   实例对应的类
     * @param cfg -     实例配置对象或singleton，如果为boolean，则为singleton类型
     */
    public static addInstance(clazz: unknown, cfg?: InstanceOption|boolean){
        const cfg1:InstanceItem = {};
        //保留inject properties
        if(this.factory.has(clazz)){
            cfg1.properties = this.factory.get(clazz).properties;
        }

        // 参数赋值
        if(!cfg){
            cfg1.singleton = true;
        }else if(typeof cfg === 'boolean'){
            cfg1.singleton = cfg;
        }else if(typeof cfg === 'object'){
            cfg1.singleton = (<InstanceOption>cfg).singleton !== false;
            cfg1.params = cfg.params;
        }
        this.factory.set(clazz, cfg1);
    }

    /**
     * 注入
     * @param targetClass -     目标类
     * @param propName -        目标属性名
     * @param injectClass -     注入类
     */
    public static inject(targetClass: unknown, propName: string, injectClass: unknown) {
        if (!this.factory.has(targetClass)) {
            this.factory.set(targetClass, {});
        }
        const cfg = this.factory.get(targetClass);
        if (!cfg.properties) {
            cfg.properties = new Map()
        }
        cfg.properties.set(propName, injectClass);
    }

    /**
     * 获取实例
     * @param clazz -   实例对应的类名
     * @param params -  参数数组
     * @returns         实例化的对象或null
     */
    public static getInstance(clazz: unknown, params?: Array<unknown>): unknown {
        const ins: InstanceItem = this.factory.get(clazz);
        if (!ins) {
            return null;
        }
        if (ins.singleton && ins.instance) {
            return ins.instance;
        } else {
            if(!params){
                params = ins.params || [];
            }
            const instance = Reflect.construct(<UnknownClass>clazz, params);
            if (ins.singleton) {
                ins.instance = instance;
            }
            if (ins.properties) {
                for (const k of ins.properties) {
                    instance[k[0]] = this.getInstance(k[1]);
                }
            }
            return instance;
        }
    }

    /**
     * 获取实例配置对象
     * @param clazz -  实例名
     * @returns      实例配置对象
     */
    public static getInstanceCfg(clazz: UnknownClass): InstanceItem {
        return this.factory.get(clazz);
    }

    /**
     * 执行实例的一个方法
     * @param instance -    实例类或实例对象
     * @param methodName -  方法名
     * @param params -      参数数组
     * @param func -        方法(与methodName二选一)
     * @returns             方法对应的结果
     */
    public static exec(instance: unknown, methodName: string, params: Array<unknown>, func?: (params:unknown[])=>unknown): unknown {
        // instance是类
        let instanceName = '';
        if (instance && typeof (instance) === 'function') {
            instanceName = instance.name;
            instance = this.getInstance(instance);
        }
        // 实例不存在
        if (!instance) {
            throw new NoomiError("1001", instanceName);
        }
        func = func || instance[methodName];
        // 方法不存在
        if (!func) {
            throw new NoomiError("1010", methodName);
        }
        return func.apply(instance, params);
    }

    /**
     * 解析instance配置文件
     * @param path - 配置文件路径
     */
    private static parse(path: string | string[]) {
        if (Array.isArray(path)) {
            for (const p of path) {
                handle(p);
            }
        } else {
            handle(path);
        }

        /**
         * 处理instance路径
         * @param path -  待解析路径
         */
        function handle(path: string) {
            const basePath = process.cwd();
            const pathArr = path.split('/');
            const pa = [basePath];
            let handled: boolean = false;    // 是否已处理
            for (let i = 0; i < pathArr.length - 1; i++) {
                const p = pathArr[i];
                if (p.indexOf('*') === -1 && p !== "") {
                    pa.push(p);
                } else if (p === '**') { // 所有子孙目录
                    handled = true;
                    if (i < pathArr.length - 2) {
                        throw new NoomiError('1000');
                    }
                    handleDir(pa.join('/'), pathArr[pathArr.length - 1], true);
                }
            }
            if (!handled) {
                handleDir(pa.join('/'), pathArr[pathArr.length - 1]);
            }

            /**
             * 处理子目录
             * @param dirPath -   目录地址
             * @param fileExt -   文件后缀
             * @param deep -      是否深度处理
             */
            function handleDir(dirPath: string, fileExt: string, deep?: boolean) {
                const dir = App.fs.readdirSync(dirPath, {withFileTypes: true});
                const fn: string = fileExt;
                const reg: RegExp = Util.toReg(fn, 3);
                for (const dirent of dir) {
                    if (dirent.isDirectory()) {
                        if (deep) {
                            handleDir(App.path.resolve(dirPath, dirent.name), fileExt, deep);
                        }
                    } else if (dirent.isFile()) {
                        // @Instance注解方式文件，自动执行instance创建操作
                        if (reg.test(dirent.name)) {
                            import(App.path.resolve(dirPath, dirent.name));
                        }
                    }
                }
            }
        }
    }

    /**
     * 类是否已添加到工厂
     * @param clazz -     类对象
     * @returns         true/false
     */
    public static hasClass(clazz: unknown): boolean {
        return this.factory.has(clazz);
    }

    /**
     * 获取instance工厂
     * @returns     实例工厂
     */
    public static getFactory(): Map<unknown, InstanceItem> {
        return this.factory;
    }
}