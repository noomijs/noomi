/**
 * cache item类型，用于cache操作参数传递
 */
export type CacheItem = {
    /**
     * 键
     */
    key: string;
    /**
     * 子键，当key对应值为map时，存取操作需要设置
     */
    subKey?: string;
    /**
     * 键对应值
     */
    value: unknown;
    /**
     * 超时时间(秒)，为0或不设置，则表示不超时
     */
    timeout?: number;
}

/**
 * cache配置类型，初始化cache时使用
 */
export type CacheOption = {
    /**
     * cache 名
     */
    name: string;
    /**
     * 存储类型 0内存，1redis，默认0，如果应用设置为集群部署，则设置无效(强制为1)
     */
    saveType: number;
    /**
     * redis名，如果saveType=1，则必须设置，默认default
     */
    redis?: string;
    /**
     * 最大空间，默认为0(表示不限制)，如果saveType=1，设置无效
     */
    maxSize?: number;
}