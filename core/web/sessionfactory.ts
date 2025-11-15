import {HttpRequest} from "./httprequest";
import {NCache} from "../tools/cache/ncache";
import {App} from "../tools/application";
import { CookieOption, SessionOption } from "../types/webtypes";
import { HttpCookie } from "./httpcookie";
import { Session } from "./session";

/**
 * session 工厂类
 * @remarks
 * 用于管理session
 * 
 * @public
 */
export class SessionFactory {
    /**
     * session map，用于存放所有session对象
     */
    static sessions: Map<string, Session> = new Map();
    /**
     * cookie中的session name，默认NSESSIONID
     */
    static sessionName: string = "NSESSIONID";
    /**
     * 过期时间(默认30分钟)
     */
    static timeout: number = 1800;
    /**
     * session存储类型 0内存 1redis，默认0
     */
    static type: number = 0;
    /**
     * redis名，type为1时需要设置，默认为default
     */
    static redis: string = 'default';
    /**
     * 缓存对象
     */
    static cache: NCache;

    /**
     * 全局cookie 配置
     */
    static cookieOption:CookieOption;

    /**
     * 参数初始化
     * @param cfg - session配置项
     */
    static init(cfg: SessionOption) {
        //设置session name
        if (typeof cfg.name === 'string') {
            const n = cfg.name.trim();
            if (n !== '') {
                this.sessionName = n;
            }
        }
        //设置timeout
        if (typeof cfg.timeout === 'number') {
            this.timeout = cfg.timeout * 60;
        }
        
        //session类型
        this.type = cfg.save_type || 0;
        this.cache = new NCache({
            name: 'NSESSION',
            maxSize: cfg.max_size,
            saveType: cfg.save_type,
            redis: cfg.redis
        });
        //保存cookie设置
        this.cookieOption = cfg.cookie;
    }

    /**
     * 获取session
     * @param req -   request对象
     * @param res -   response对象
     */
    static async getSession(req: HttpRequest) {
        // session存在
        let id: string = this.getSessionId(req);
        const cTime = new Date().getTime();
        let needCreate: boolean = false;
        // 新建session
        if (!id) {
            id = this.genSessionId();
            needCreate = true;
        } else {
            needCreate = !await this.cache.has(id);
        }
        // 需要创建
        if (needCreate) {
            // 新建session
            await this.cache.set(
                {
                    key: id,
                    value: {
                        create: cTime
                    }
                },
                this.timeout
            );
        }
        // 得到session对象
        const session = new Session(id);
        // 设置cookie sessionid和过期时间
        const cookie = new HttpCookie(this.sessionName,id);
        //根据配置
        if(this.cookieOption.domain){
            cookie.setDomain(this.cookieOption.domain);
        }
        if(this.cookieOption.http_only){
            cookie.setHttpOnly(true);
        }
        if(this.cookieOption.secure){
            cookie.setSecure(true);
        }
        if(this.cookieOption.path){
            cookie.setPath(this.cookieOption.path);
        }
        if(this.cookieOption.max_age){
            cookie.setMaxAge(this.cookieOption.max_age);
        }else if(this.timeout){
            cookie.setMaxAge(this.timeout * 60);
        }
        req.response.addCookie(cookie);
        return session;
    }

    /**
     * 删除session
     * @param sessionId -     sessionId
     */
    static async delSession(sessionId: string) {
        await this.cache.del(sessionId);
    }

    /**
     * 创建sessionId
     * @returns     用uuid生成的sessionId
     */
    static genSessionId(): string {
        // 去掉‘-’
        return App.uuid.v1().replace(/\-/, '');
    }

    /**
     * 获取cookie携带的sessionId
     * @param req -     request对象
     * @returns         sessionId
     */
    static getSessionId(req: HttpRequest): string {
        return req.getCookie(this.sessionName)?.getValue();
    }
}