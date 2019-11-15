"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorfactory_1 = require("./errorfactory");
const application_1 = require("./application");
/**
 * redis 工厂
 */
class RedisFactory {
    /**
     * 添加redis client
     * @param cfg
     */
    static addClient(cfg) {
        let client = application_1.App.redis.createClient(cfg.port, cfg.host, cfg.options);
        client.on('error', err => {
            throw err;
        });
        this.clientMap.set(cfg.name, client);
    }
    /**
     * 获得redis client
     * @param name      client name，默认default
     * @return          client
     */
    static getClient(name) {
        name = name || 'default';
        if (this.clientMap.has(name)) {
            return this.clientMap.get(name);
        }
        return null;
    }
    /**
     * 设置值
     * @param clientName    client name
     * @param item          redis item
     */
    static async set(clientName, item) {
        let client = this.getClient(clientName);
        if (client === null) {
            throw new errorfactory_1.NoomiError("2601", clientName);
        }
        //合并pre
        let key = item.pre ? item.pre + item.key : item.key;
        if (item.subKey) {
            await new Promise((resolve, reject) => {
                client.hset(key, item.subKey, item.value, (err, v) => {
                    resolve(v);
                });
            });
        }
        else {
            if (Array.isArray(item.value)) { //多个键，值组成的数组
                await new Promise((resolve, reject) => {
                    client.hmset.apply(client, [key].concat(item.value), (err, v) => {
                        resolve(v);
                    });
                });
            }
            else if (typeof item.value === 'object') { //对象用set存储
                await new Promise((resolve, reject) => {
                    client.hmset(key, item.value, (err, v) => {
                        resolve(v);
                    });
                });
            }
            else {
                await new Promise((resolve, reject) => {
                    client.set(key, item.value, (err, v) => {
                        resolve(v);
                    });
                });
            }
        }
        this.setTimeout(client, key, item.timeout);
    }
    /**
     * 获取值
     * @param clientName    client name
     * @param item          redis item
     * @return              item value
     */
    static async get(clientName, item) {
        let client = this.getClient(clientName);
        if (client === null) {
            throw new errorfactory_1.NoomiError("2601", clientName);
        }
        //合并pre
        let key = item.pre ? item.pre + item.key : item.key;
        let retValue;
        //有subKey
        if (item.subKey) {
            retValue = await new Promise((resolve, reject) => {
                client.hget(key, item.subKey, (err, value) => {
                    if (!err) {
                        resolve(value);
                    }
                });
            });
        }
        else {
            retValue = await new Promise((resolve, reject) => {
                client.get(key, (err, value) => {
                    if (err) {
                        console.log(err);
                        // throw err;
                    }
                    resolve(value);
                });
            });
        }
        this.setTimeout(client, key, item.timeout);
        return retValue;
    }
    /**
     * 是否存在某个key
     * @param clientName    redis name
     * @param key           key
     * @return              true/false
     */
    static async has(clientName, key) {
        let client = this.getClient(clientName);
        if (client === null) {
            throw new errorfactory_1.NoomiError("2601", clientName);
        }
        let re = await new Promise(resolve => {
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
     * 设置过期时间
     * @param client
     * @param key
     * @param timeout
     */
    static async setTimeout(client, key, timeout) {
        if (typeof timeout !== 'number' || timeout <= 0) {
            return;
        }
        let cn;
        if (typeof client === 'string') {
            cn = client;
            client = this.getClient(client);
        }
        if (client === null) {
            throw new errorfactory_1.NoomiError("2601", cn);
        }
        client.expire(key, timeout);
    }
    /**
     * 获取map数据
     * @param clientName    client name
     * @param key           key
     * @param pre           pre key
     */
    static async getMap(clientName, item) {
        let client = this.getClient(clientName);
        let key = item.pre ? item.pre + item.key : item.key;
        if (client === null) {
            throw new errorfactory_1.NoomiError("2601", clientName);
        }
        let r = new Promise((resolve, reject) => {
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
     * 删除项
     * @clientName      redis name
     * @param key       键
     * @param subKey    子键
     */
    static del(clientName, key, subKey) {
        let client = this.getClient(clientName);
        if (client === null) {
            throw new errorfactory_1.NoomiError("2601", clientName);
        }
        if (subKey !== undefined) {
            client.hdel(key, subKey);
        }
        else {
            client.del(key);
        }
    }
    /**
     * 解析配置文件
     * @param path
     */
    static parseFile(path) {
        //读取文件
        let json = null;
        try {
            let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2600") + '\n' + e;
        }
        this.init(json);
    }
    /**
     * 初始化
     * @param config    rdis配置
     */
    static init(config) {
        //可以为数组，也可以为单个对象
        if (Array.isArray(config)) {
            let index = 0;
            for (let jo of config) {
                //设置名字
                if (!jo.name) {
                    if (index === 0) {
                        jo.name = 'default';
                    }
                    else {
                        jo.name = 'default' + index;
                    }
                    index++;
                }
                this.addClient(jo);
            }
        }
        else {
            if (!config.name) {
                config.name = 'default';
            }
            this.addClient(config);
        }
    }
}
exports.RedisFactory = RedisFactory;
RedisFactory.clientMap = new Map();
//# sourceMappingURL=redisfactory.js.map