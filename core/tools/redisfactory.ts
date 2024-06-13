import {NoomiError} from "./noomierror";
import {App} from "./application";
import { RedisCfg, RedisInst, RedisItem } from "../types/redistypes";
import { Util } from "./util";


/**
 * redis 工厂
 */
export class RedisFactory {
    /**
     * 存储所有的redis对象
     */
    private static clientMap: Map<string, RedisInst> = new Map();

    /**
     * 添加redis client到clientMap
     * @param cfg -   redis配置项
     */
    public static addClient(cfg: RedisCfg) {
        const client = App.redis.createClient(cfg.port, cfg.host, cfg.options);
        client.on('error', err => {
            throw err;
        });
        this.clientMap.set(cfg.name, client);
    }

    /**
     * 获得redis client
     * @param name -      client name，默认default
     * @returns          redis client
     */
    public static getClient(name: string):RedisInst {
        name = name || 'default';
        if (this.clientMap.has(name)) {
            return this.clientMap.get(name);
        }
        return null;
    }

    /**
     * 把值存入redis中
     * @param clientName -    client name
     * @param item -          redis item
     */
    public static async set(clientName: string, item: RedisItem) {
        const client = this.getClient(clientName);
        if (client === null) {
            throw new NoomiError("2601", clientName);
        }
        if (!item.value) {
            throw new NoomiError("3011");
        }
        // 合并pre
        const key: string = item.pre ? item.pre + item.key : item.key;
        // buffer 转 string
        const value = item.value;
        if (item.subKey) {
            await new Promise((resolve) => {
                client.hset(key, item.subKey, value, (err, v) => {
                    resolve(v);
                });
            })
        } else {
            if (Array.isArray(value)) {// 多个键，值组成的数组
                await new Promise((resolve) => {
                    client.hmset([key].concat(value), (err, v) => {
                        resolve(v);
                    });
                });
            } else if (typeof value === 'object') {// 对象用set存储
                await new Promise((resolve) => {
                    client.hmset(key, <object>value, (err, v) => {
                        resolve(v);
                    });
                });
            } else {
                await new Promise((resolve) => {
                    client.set(key, value, (err, v) => {
                        resolve(v);
                    });
                });
            }
        }
        this.setTimeout(client, key, item.timeout);
    }

    /**
     * 从redis 中取值
     * @param clientName -  client name
     * @param item -        redis item
     * @returns             item value
     */
    public static async get(clientName: string, item: RedisItem): Promise<string> {
        const client = this.getClient(clientName);
        if (client === null) {
            throw new NoomiError("2601", clientName);
        }
        // 合并pre
        const key: string = item.pre ? item.pre + item.key : item.key;
        let retValue: unknown;
        // 有subKey
        if (item.subKey) {
            retValue = await new Promise((resolve) => {
                client.hget(key, item.subKey, (err, value) => {
                    if (!err) {
                        resolve(value);
                    }
                });
            });
        } else {
            retValue = await new Promise((resolve) => {
                client.get(key, (err, value) => {
                    if (err) {
                        console.error(err);
                    }
                    resolve(value);
                });
            });
        }
        this.setTimeout(client, key, item.timeout);
        return <string>retValue;
    }

    /**
     * 获取map数据
     * @param clientName -  client name
     * @param item -        RedisItem
     * @returns             object或null
     */
    public static async getMap(clientName: string, item: RedisItem):Promise<unknown> {
        const client = this.getClient(clientName);
        const key: string = item.pre ? item.pre + item.key : item.key;
        if (client === null) {
            throw new NoomiError("2601", clientName);
        }
        const r = await new Promise((resolve) => {
            client.hgetall(key, (err, value) => {
                if (!err) {
                    resolve(value);
                }
            });
        });
        if (item.timeout && item.timeout > 0) {
            this.setTimeout(clientName, item.key, item.timeout);
        }
        return r;
    }

    /**
     * 是否存在某个key
     * @param clientName -    redis name
     * @param key -           key
     * @returns              存在则返回true，否则返回false
     */
    public static async has(clientName: string, key: string): Promise<boolean> {
        const client = this.getClient(clientName);
        if (client === null) {
            throw new NoomiError("2601", clientName);
        }
        const re = await new Promise(resolve => {
            client.exists(key, (err, v) => {
                resolve(v);
            });
        });
        if (re === 1) {
            return true;
        }
        return false;
    }

    /**
     * 设置超时时间
     * @param client -    client name
     * @param key -       键
     * @param timeout -   超时时间
     */
    public static async setTimeout(client: RedisInst|string, key: string, timeout: number) {
        if (typeof timeout !== 'number' || timeout <= 0) {
            return;
        }
        let cn;
        if (typeof client === 'string') {
            cn = client;
            client = this.getClient(client);
        }
        if (client === null) {
            throw new NoomiError("2601", cn);
        }
        client.expire(key, timeout);
    }

    /**
     * 删除项
     * @param clientName -    client name
     * @param key -           键
     * @param subKey -        子键
     */
    public static async del(clientName: string, key: string, subKey?: string) {
        const client = this.getClient(clientName);
        if (client === null) {
            throw new NoomiError("2601", clientName);
        }
        if (subKey !== undefined) {
            client.hdel(key, subKey);
        } else {
            client.del(key);
        }
    }

    /**
     * 清空
     * @param clientName -    client name
     */
    public static async clear(clientName: string) {
        const client = this.getClient(clientName);
        if (client === null) {
            throw new NoomiError("2601", clientName);
        }
        await client.flushdb();
    }

    /**
     * 解析配置文件
     * @param path -  redis配置文件路径
     */
    public static parseFile(path: string) {
        // 读取文件
        let json: object = null;
        try {
            const jsonStr: string = App.fs.readFileSync(path, 'utf-8');
            json = <object>Util.eval(jsonStr);
        } catch (e) {
            throw new NoomiError("2600") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 初始化
     * @param config -    redis配置
     */
    public static init(config) {
        // 可以为数组，也可以为单个对象
        if (Array.isArray(config)) {
            let index = 0;
            for (const jo of config) {
                // 设置名字
                if (!jo.name) {
                    if (index === 0) {
                        jo.name = 'default';
                    } else {
                        jo.name = 'default' + index;
                    }
                    index++;
                }
                this.addClient(jo);
                // 清空redis
                RedisFactory.clear(jo.name);
            }
        } else {
            if (!config.name) {
                config.name = 'default'
            }
            this.addClient(config);
            // 清空redis
            RedisFactory.clear(config.name);
        }
    }
}