interface RedisCfg {
    name?: string;
    host: string;
    port: string;
    options?: any;
}
/**
 * redis项
 */
interface RedisItem {
    key: string;
    pre?: string;
    subKey?: string;
    value?: any;
    timeout?: number;
}
/**
 * redis 工厂
 */
declare class RedisFactory {
    static clientMap: Map<string, any>;
    /**
     * 添加redis client
     * @param cfg
     */
    static addClient(cfg: RedisCfg): void;
    /**
     * 获得redis client
     * @param name      client name，默认default
     * @return          client
     */
    static getClient(name: string): any;
    /**
     * 设置值
     * @param clientName    client name
     * @param item          redis item
     */
    static set(clientName: string, item: RedisItem): Promise<void>;
    /**
     * 获取值
     * @param clientName    client name
     * @param item          redis item
     * @return              item value
     */
    static get(clientName: string, item: RedisItem): Promise<string>;
    /**
     * 是否存在某个key
     * @param clientName    redis name
     * @param key           key
     * @return              true/false
     */
    static has(clientName: string, key: string): Promise<boolean>;
    /**
     * 设置过期时间
     * @param client
     * @param key
     * @param timeout
     */
    static setTimeout(client: any, key: string, timeout: number): Promise<void>;
    /**
     * 获取map数据
     * @param clientName    client name
     * @param key           key
     * @param pre           pre key
     */
    static getMap(clientName: string, item: RedisItem): Promise<unknown>;
    /**
     * 删除项
     * @clientName      redis name
     * @param key       键
     * @param subKey    子键
     */
    static del(clientName: string, key: string, subKey?: string): void;
    /**
     * 解析配置文件
     * @param path
     */
    static parseFile(path: string): void;
    /**
     * 初始化
     * @param config    rdis配置
     */
    static init(config: any): void;
}
export { RedisFactory };
