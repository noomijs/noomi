/**
 * cache类
 */
interface CacheItem {
    key: string;
    subKey?: string;
    value: any;
    timeout?: number;
}
interface CacheCfg {
    name: string;
    saveType: number;
    redis?: string;
    maxSize?: number;
}
export declare class NCache {
    redis: string;
    memoryCache: MemoryCache;
    name: string;
    saveType: number;
    redisSizeName: string;
    redisPreName: string;
    redisTimeout: string;
    /**
     *
     * @param name
     * @param saveType
     * @param maxSize
     */
    constructor(cfg: CacheCfg);
    /**
     * 添加到cache
     * @param key       键
     * @param value     值
     * @param extra     附加信息
     * @param timeout   超时时间(秒)
     */
    set(item: CacheItem, timeout?: number): Promise<void>;
    /**
     * 获取值
     * @param key           键
     * @param changeExpire  是否更新过期时间
     * @return              value或null
     */
    get(key: string, subKey?: string, changeExpire?: boolean): Promise<any>;
    /**
     * 获取值
     * @param key           键
     * @param changeExpire  是否更新过期时间
     * @return              value或null
     */
    getMap(key: string, changeExpire?: boolean): Promise<any>;
    /**
     * 删除
     * @param key 键
     */
    del(key: string, subKey?: string): Promise<void>;
    /**
     * 获取键
     * @param key   键，可以带通配符
     */
    getKeys(key: string): Promise<Array<string>>;
    /**
     * 是否拥有key
     * @param key
     * @return   true/false
     */
    has(key: string): Promise<boolean>;
    /**
     * 从redis获取值
     * @param key           键
     * @apram subKey        子键
     * @param changeExpire  是否修改expire
     */
    private getFromRedis;
    /**
     * 从redis获取值
     * @param key           键
     * @apram subKey        子键
     * @param changeExpire  是否修改expire
     */
    private getMapFromRedis;
    /**
     * 存到redis
     * @param item      Redis item
     * @param timeout   超时
     */
    private addToRedis;
}
declare class MemoryItem {
    key: string;
    type: number;
    createTime: number;
    timeout: number;
    expire: number;
    useRcds: Array<any>;
    LRU: number;
    value: any;
    size: number;
    constructor(timeout?: number);
}
/**
 * 存储区
 */
declare class MemoryCache {
    maxSize: number;
    extraSize: number;
    storeMap: Map<string, any>;
    size: number;
    constructor(cfg: any);
    set(item: CacheItem, timeout?: number): void;
    /**
     * 取值
     * @param key
     * @param subKey
     * @param changeExpire
     */
    get(key: string, subKey?: string, changeExpire?: boolean): any;
    /**
     * 获取值
     * @param key           键
     * @param changeExpire  是否更新过期时间
     * @return              value或null
     */
    getMap(key: string, changeExpire?: boolean): any;
    /**
     * 获取键
     * @param key   键，可以带通配符
     */
    getKeys(key: string): Array<string>;
    /**
     * 删除键
     * @param key       键
     * @param subKey    子键
     */
    del(key: string, subKey?: string): void;
    /**
     * 是否拥有key
     * @param key
     * @return   true/false
     */
    has(key: string): boolean;
    /**
     * 修改最后使用状态
     * @param item              memory item
     * @param changeExpire      释放修改expire
     */
    changeLastUse(item: MemoryItem, changeExpire?: boolean): void;
    /**
     * 获取内容实际size utf8
     * @param value     待检测值
     * @return          size
     */
    getRealSize(value: any): number;
    /**
     * 清理缓存
     * @param size  清理大小，为0仅清除超时元素
     */
    cleanup(size: number): void;
    /**
     * 通过lru进行清理
     * @return      清理的尺寸
     */
    clearByLRU(): number;
    /**
     * 检查和清理空间
     * @param item  cacheitem
     */
    checkAndClean(item: CacheItem): void;
    /**
     * 计算LRU
     * timeout 的权重为5（先保证timeout由时间去清理）
     * right = sum(1-(当前时间-使用记录)/当前时间) + timeout?5:0
     * @param item
     */
    cacLRU(item: MemoryItem): void;
}
export {};
