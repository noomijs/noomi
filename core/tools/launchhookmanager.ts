import { InstanceFactory } from "../main/instancefactory";


/**
 * hook 对象
 * @since 0.3.5
 */
interface IHookObj{
    /**
     * 实例名
     */
    clazz:any;

    /**
     * 方法名
     */
    method:string;

    /**
     * 参数数组
     */
    params?:Array<any>
}

/**
 * 启动后执行钩子对象管理器
 * @since 0.3.5
 */
export class LaunchHookManager{
    /**
     * hook实例数组
     */
    static hooks:Array<IHookObj> = new Array();
    
    /**
     * 初始化
     * @param cfg [{"clazz":实例类,"method":方法名,params:参数数组}...]
     */
    static init(cfg:IHookObj){
        if(!InstanceFactory.hasClass(cfg.clazz)) {
            InstanceFactory.addInstance(cfg.clazz);
        }
        this.hooks.push(cfg);
    }

    /**
     * 批量执行hook方法
     */
    static async run(){
        let h:IHookObj;
        for(h of this.hooks){
            await InstanceFactory.exec(h.clazz,h.method,h.params);
        }
    }
    /**
     * 解析配置文件
     * @param path  launch hook配置文件路径
     */
    // static parseFile(path:string){
    //     //读取文件
    //     let json:any = null;
    //     try{
    //         let jsonStr:string = App.fs.readFileSync(path,'utf-8');
    //         json = App.JSON.parse(jsonStr);
    //     }catch(e){
    //         throw new NoomiError("2600") + '\n' + e;
    //     }
    //     this.init(json);
    // }
}