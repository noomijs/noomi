import { HttpRequest } from "./httprequest";
import { NCache } from "../tools/ncache";
import { App } from "../tools/application";

/**
 * session配置项
 */
interface ISessionCfg{
    /**
     * sessionId名
     */
    name:string;
    /**
     * 超时时间
     */
    timeout:number;
    
    /**
     * 存储类型 0:memory 1:redis
     */
    save_type?:number;  
    /**
     * 缓存最大尺寸，save_type=0时有效
     */
    max_size:number; 
    /**
     * redis名，save_type=1时有效
     */
    redis?:string;
}

/**
 * session 工厂类
 * @remarks
 * 用于管理session
 */
class SessionFactory {
    /**
     * session map，用于存放所有session对象
     */
    static sessions:Map<string,Session> = new Map();
    /**
     * cookie中的session name，默认NSESSIONID
     */
    static sessionName:string = "NSESSIONID";

    /**
     * 过期时间(默认30分钟)
     */
    static timeout:number = 1800;
    /**
     * session存储类型 0内存 1redis，默认0
     */
    static type:number=0;         
    /**
     * redis名，type为1时需要设置，默认为default
     */                  
    static redis:string='default';
    /**
     * 缓存对象
     */
    static cache:NCache;
    /**
     * 参数初始化
     * @param cfg session配置项
     */
    static init(cfg:ISessionCfg){
        //设置session name
        if(typeof cfg.name === 'string'){
            let n = cfg.name.trim();
            if(n !== ''){
                this.sessionName = n;
            }
        }

        //设置timeout
        if(typeof cfg.timeout === 'number'){
            this.timeout = cfg.timeout * 60;
        }
        //session类型
        this.type = cfg.save_type || 0;
        this.cache = new NCache({
            name:'NSESSION',
            maxSize:cfg.max_size,
            saveType:cfg.save_type,
            redis:cfg.redis
        });
    }

    /**
     * 获取session  
     * @param req   request对象
     * @param res   response对象
     */    
    static async getSession(req:HttpRequest) {
        //session存在
        let id:string = this.getSessionId(req);
        let session:Session;
        let cTime = new Date().getTime();
        let expTime = cTime + this.timeout * 1000;
        let needCreate:boolean = false;
        //新建session
        if(!id){
            id = this.genSessionId();
            needCreate = true;
        }else{
            needCreate = ! await this.cache.has(id);
            
        }
        //需要创建
        if(needCreate){
            //新建session
            await this.cache.set(
                {
                    key:id,
                    value:{
                        create:cTime
                    }
                },
                this.timeout
            );
        }
        //得到session对象
        session = new Session(id);
        //设置cookie sessionid和过期时间
        let cookie = req.response.cookie;
        cookie.set(this.sessionName,id);
        cookie.set('Expires',new Date(expTime).toUTCString());
        return session;
    }

    /**
     * 删除session
     * @param sessionId     sessionId
     */
    static async delSession(sessionId:string){
        await this.cache.del(sessionId);
    }
    /**
     * 创建sessionId
     * @returns     用uuid生成的sessionId
     */
    static genSessionId():string{
        let s = App.uuid.v1();
        //去掉‘-’
        return s.replace(/\-/,'');
    }
    
    /**
     * 获取cookie携带的sessionId
     * @param req   request对象
     * @returns     sessionId
     */
    static getSessionId(req: HttpRequest): string {
        let cookies = {};
        let cook:any = req.getHeader('cookie');
        cook && cook.split(';').forEach(parms => {
            let parts = parms.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
        });
        return cookies[this.sessionName];
    }
}

/**
 * session 类
 */
class Session {
    /**
     * session id
     */
    id: string;  
    /**
     * 构造器
     * @param id sessionId 
     */           
    constructor(id:string){
        this.id = id;
    }
    /**
     * 获取session值
     * @param key   键
     * @return      值或null
     */
    async get(key:string):Promise<any> {
        return await SessionFactory.cache.get(this.id,key);
    }
    /**
     * 设置session值
     * @param key   键 
     * @param value 值
     */
    async set(key:string, value:any) {
        if(value === undefined){
            return;
        }
        await SessionFactory.cache.set({
            key:this.id,
            subKey:key,
            value:value
        },SessionFactory.timeout);
    }

    /**
     * 删除session值
     * @param key   键
     */
    async del(key:string){
        await SessionFactory.cache.del(this.id,key);
    }
}
export {SessionFactory,Session};
