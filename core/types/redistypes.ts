/**
 * redis 配置项
 */
export type RedisCfg = {
    /**
     * redis名
     */
    name?: string,
    /**
     * 主机地址
     */
    host: string,
    /**
     * 端口号
     */
    port: string,
    /**
     * 其它配置，请参考npm redis
     */
    options?: object
}

/**
 * redis存储项
 */
export type RedisItem = {
    /**
     * 键
     */
    key: string;
    /**
     * pre key,与pre+key作为真正的key
     */
    pre?: string;
    /**
     * 子键
     */
    subKey?: string;
    /**
     * 值
     */
    value?: unknown,
    /**
     * 超时时间
     */
    timeout?: number;
}

/**
 * redis实例
 */
export type RedisInst={
    keys:(key:string)=>string[];
    hset:(key:string,subKey:string,value:unknown,foo:(err,v)=>void)=>void;
    hmset:(key:string|string[],value?:object,foo?:(err,v)=>void)=>void;
    set:(key:string,value:unknown,foo:(err,v)=>void)=>void;
    hget:(key:string,subKey:string,foo:(err,v)=>void)=>string;
    get:(key:string,foo:(err,v)=>void)=>string;
    hgetall:(key:string, foo:(err, value)=>void)=>unknown;
    exists:(key:string, foo:(err, value)=>void)=>boolean;
    hdel:(key, subKey)=>void;
    del:(key)=>void;
    flushdb:()=>void;
    expire:(key, timeout)=>void;
}