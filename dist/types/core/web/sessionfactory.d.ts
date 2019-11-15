import { HttpRequest } from "./httprequest";
import { NCache } from "../tools/ncache";
interface SessionCfg {
    name: string;
    timeout: number;
    max_size: number;
    save_type?: number;
    redis?: string;
}
/**
 * session 工厂类
 */
declare class SessionFactory {
    static sessions: Map<string, Session>;
    static sessionName: string;
    static timeout: number;
    static type: number;
    static redis: string;
    static cache: NCache;
    /**
     * 参数初始化
     * @param cfg
     */
    static init(cfg: SessionCfg): void;
    /**
     * 获取session
     * @param req   request
     * @param res   response
     */
    static getSession(req: HttpRequest): Promise<Session>;
    /**
     * 删除session
     * @param sessionId session id
     */
    static delSession(sessionId: string): Promise<void>;
    /**
     * 创建sessionid
     */
    static genSessionId(): string;
    /**
     * 获取当前sessionId
     * @param req   request
     */
    static getSessionId(req: HttpRequest): string;
}
/**
 * session 类
 */
declare class Session {
    id: string;
    constructor(id: string);
    /**
     * 获取session值
     * @param key   键
     * @return      值或null
     */
    get(key: string): Promise<any>;
    /**
     * 设置session
     * @param key   键
     * @param value 值
     */
    set(key: string, value: any): Promise<void>;
    /**
     * 删除键
     * @param key   键
     */
    del(key: string): Promise<void>;
}
export { SessionFactory, Session };
