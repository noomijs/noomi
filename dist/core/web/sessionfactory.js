"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ncache_1 = require("../tools/ncache");
const application_1 = require("../tools/application");
/**
 * session 工厂类
 */
class SessionFactory {
    /**
     * 参数初始化
     * @param cfg
     */
    static init(cfg) {
        //设置session name
        if (typeof cfg.name === 'string') {
            let n = cfg.name.trim();
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
        this.cache = new ncache_1.NCache({
            name: 'NSESSION',
            maxSize: cfg.max_size,
            saveType: cfg.save_type,
            redis: cfg.redis
        });
    }
    /**
     * 获取session
     * @param req   request
     * @param res   response
     */
    static async getSession(req) {
        //session存在
        let id = this.getSessionId(req);
        let session;
        let cTime = new Date().getTime();
        let expTime = cTime + this.timeout * 1000;
        let needCreate = false;
        //新建session
        if (!id) {
            id = this.genSessionId();
            needCreate = true;
        }
        else {
            let s = await this.cache.get(id);
            if (s === null) {
                needCreate = true;
            }
        }
        //需要创建
        if (needCreate) {
            //新建session
            await this.cache.set({
                key: id,
                value: {
                    create: cTime
                }
            }, this.timeout);
        }
        //得到session对象
        session = new Session(id);
        //设置cookie sessionid和过期时间
        let cookie = req.response.cookie;
        cookie.set(this.sessionName, id);
        cookie.set('Expires', new Date(expTime).toUTCString());
        return session;
    }
    /**
     * 删除session
     * @param sessionId session id
     */
    static async delSession(sessionId) {
        await this.cache.del(sessionId);
    }
    /**
     * 创建sessionid
     */
    static genSessionId() {
        return application_1.App.uuid.v1();
    }
    /**
     * 获取当前sessionId
     * @param req   request
     */
    static getSessionId(req) {
        let cookies = {};
        let cook = req.getHeader('cookie');
        cook && cook.split(';').forEach(parms => {
            let parts = parms.split('=');
            cookies[parts[0].trim()] = (parts[1] || '').trim();
        });
        return cookies[this.sessionName];
    }
}
exports.SessionFactory = SessionFactory;
SessionFactory.sessions = new Map();
SessionFactory.sessionName = "NSESSIONID"; //cookie中的session name
SessionFactory.timeout = 1800; //过期时间(默认30分钟)
SessionFactory.type = 0; //session存储类型 0内存 1redis，默认0
SessionFactory.redis = 'default'; //redis名，type为1时需要设置，默认为default
/**
 * session 类
 */
class Session {
    constructor(id) {
        this.id = id;
    }
    /**
     * 获取session值
     * @param key   键
     * @return      值或null
     */
    async get(key) {
        return await SessionFactory.cache.get(this.id, key);
    }
    /**
     * 设置session
     * @param key   键
     * @param value 值
     */
    async set(key, value) {
        if (value === undefined) {
            return;
        }
        await SessionFactory.cache.set({
            key: this.id,
            subKey: key,
            value: value
        }, SessionFactory.timeout);
    }
    /**
     * 删除键
     * @param key   键
     */
    async del(key) {
        await SessionFactory.cache.del(this.id, key);
    }
}
exports.Session = Session;
//# sourceMappingURL=sessionfactory.js.map