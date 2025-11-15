import {NoomiError} from "../noomierror";
import {RedisFactory} from "../redisfactory";
import {App} from "../application";
import { CacheItem, CacheOption } from "../../types/cachetypes";
import { MemoryCache } from "./memorycache";

/**
 * Cache类
 * @remarks
 * 用于处理缓存，支持内存cache和redis cache
 * 
 * @public
 */
export class NCache {
    /**
     * redis名，saveType为1时存在
     */
    redis: string;
    /**
     * 内存cache对象，saveType=0时存在
     */
    memoryCache: MemoryCache;
    /**
     * cache名字，全局唯一
     */
    name: string;
    /**
     * 存储类型 0内存 1redis
     */
    saveType: number;
    /**
     * redis存储的cache size名字前缀
     */
    redisSizeName: string = 'NCACHE_SIZE_';
    /**
     * redis存储前缀
     */
    redisPreName: string = 'NCACHE_';
    /**
     * timeout redis 前缀
     */
    redisTimeout: string = 'NCACHE_TIMEOUT_';

    /**
     * 构造器
     * @param cfg -   cache初始化参数
     */
    constructor(cfg: CacheOption) {
        // 如果为App为集群，则saveType为1，否则为设置值
        if (App.isCluster) {
            this.saveType = 1;
        } else {
            this.saveType = cfg.saveType || 0;
        }
        this.name = App.appName + '_' + cfg.name;
        this.redis = cfg.redis;

        if (this.saveType === 0) {
            this.memoryCache = new MemoryCache(cfg)
        } else {
            this.redisPreName += this.name + '_';
            this.redisTimeout += this.name + '_';
        }
    }

    /**
     * 添加值到cache
     * @param item -      cache item
     * @param timeout -   超时时间(秒)
     */
    async set(item: CacheItem, timeout?: number) {
        // 清除undefined和null属性值
        const value = item.value;
        Object.getOwnPropertyNames(value).forEach((p) => {
            if (value[p] === undefined || value[p] === null) {
                delete value[p];
            }
        });
        if (this.saveType === 0) { // 数据存到内存
            this.memoryCache.set(item, timeout);
        } else {// 数据存到redis
            await this.addToRedis(item, timeout);
        }
    }

    /**
     * 获取值
     * @param key -           键
     * @param subKey -        子键
     * @param changeExpire -  是否更新过期时间
     * @returns             value或null
     */
    async get(key: string, subKey?: string, changeExpire?: boolean): Promise<unknown> {
        if (this.saveType === 0) {
            return this.memoryCache.get(key, subKey);
        } else {
            return await this.getFromRedis(key, subKey, changeExpire);
        }
    }

    /**
     * 获取map，当key对应的存储对象为map时，则获取map，否则为null
     * @param key -           键
     * @param changeExpire -  是否更新过期时间
     * @returns              object或null
     */
    async getMap(key: string, changeExpire?: boolean): Promise<object> {
        if (this.saveType === 0) {
            return this.memoryCache.getMap(key);
        } else {
            return await this.getMapFromRedis(key, changeExpire);
        }
    }

    /**
     * 删除键
     * @param key -       键
     * @param subKey -    子键
     */
    async del(key: string, subKey?: string) {
        if (this.saveType === 0) {
            this.memoryCache.del(key, subKey);
        } else {
            await RedisFactory.del(this.redis, this.redisPreName + key, subKey);
        }
    }

    /**
     * 清理缓存空间
     */
    public async clearAll() {
        if (this.saveType === 0) {
            this.memoryCache.cleanup();
        } else {
            await RedisFactory.clear(this.redis);
        }
    }

    /**
     * 获取键数组
     * @param key -   键，可以带通配符
     * @returns     键名组成的数组
     */
    async getKeys(key: string): Promise<Array<string>> {
        if (this.saveType === 0) {
            return this.memoryCache.getKeys(key);
        } else {
            const client = RedisFactory.getClient(this.redis);
            if (client === null) {
                throw new NoomiError("2601", this.redis);
            }
            const arr = client.keys(this.redisPreName + key);
            //把前缀去掉
            arr.forEach((item, i) => {
                arr[i] = item.substring(this.redisPreName.length);
            })
            return arr;
        }
    }

    /**
     * 是否拥有key
     * @param key -   键
     * @returns     如果存在则返回true，否则返回false
     */
    async has(key: string): Promise<boolean> {
        if (this.saveType === 0) {
            return this.memoryCache.has(key);
        } else {
            return await RedisFactory.has(this.redis, this.redisPreName + key);
        }
    }

    /**
     * 从redis获取值
     * @param key -           键
     * @param subKey -        子键
     * @param changeExpire -  是否修改expire
     * @returns             键对应的值
     */
    private async getFromRedis(key: string, subKey?: string, changeExpire?: boolean): Promise<unknown> {
        let timeout: number = 0;
        if (changeExpire) {
            const ts: string = await RedisFactory.get(this.redis, {
                pre: this.redisTimeout,
                key: key
            });
            if (ts !== null) {
                timeout = parseInt(ts);
            }
        }
        const value = await RedisFactory.get(this.redis, {
            pre: this.redisPreName,
            key: key,
            subKey: subKey,
            timeout: timeout
        });
        return value || null;
    }

    /**
     * 从redis获取map
     * @param key -             键
     * @param subKey-           子键
     * @param changeExpire -    是否修改expire
     * @returns                 object或null
     */
    private async getMapFromRedis(key: string, changeExpire?: boolean): Promise<object> {
        let timeout: number = 0;
        // 超时修改expire
        if (changeExpire) {
            const ts = await RedisFactory.get(this.redis, {
                pre: this.redisTimeout,
                key: key
            });
            if (ts !== null) {
                timeout = parseInt(ts);
            }
        }
        const value = await RedisFactory.getMap(this.redis, {
            key: key,
            pre: this.redisPreName,
            timeout: timeout
        });
        return <object>value || null;
    }

    /**
     * 存到值redis
     * @param item -      cache item
     * @param timeout -   超时时间
     */
    private async addToRedis(item: CacheItem, timeout?: number) {
        // 存储timeout
        if (typeof timeout === 'number' && timeout > 0) {
            await RedisFactory.set(
                this.redis,
                {
                    pre: this.redisTimeout,
                    key: item.key,
                    value: timeout
                }
            );
        }
        // 存储值
        await RedisFactory.set(
            this.redis,
            {
                pre: this.redisPreName,
                key: item.key,
                subKey: item.subKey,
                value: item.value,
                timeout: timeout
            }
        );
    }
}