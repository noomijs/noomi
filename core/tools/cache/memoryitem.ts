/**
 * 内存存储项类
 * 
 * @public
 */
export class MemoryItem {
    /**
     * 键
     */
    key: string;
    /**
     * 类型0 字符串  1 map
     */
    type: number;
    /**
     * 创建时间
     */
    createTime: number;
    /**
     * 超时时间(秒)
     */
    timeout: number;
    /**
     * 过期时间
     */
    expire: number;
    /**
     * 使用记录，用于LRU置换，记录最近5次访问时间
     */
    useRcds: Array<number>;
    /**
     * 最近最久使用值，值越大越不淘汰
     */
    LRU: number;
    /**
     * 值
     */
    value: unknown;
    /**
     * 存储空间
     */
    size: number;

    /**
     * 构造器
     * @param timeout - 超时时间
     */
    constructor(timeout?: number) {
        this.createTime = new Date().getTime();
        if (timeout && typeof timeout === 'number') {
            this.timeout = timeout * 1000;
            this.expire = this.createTime + this.timeout;
        }
        this.size = 0;
        this.useRcds = [];
        this.LRU = 1;
    }
}