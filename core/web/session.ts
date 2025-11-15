import { SessionFactory } from "./sessionfactory";

/**
 * session 类
 * 
 * @public
 */
export class Session {
    /**
     * session id
     */
    id: string;

    /**
     * 构造器
     * @param id - sessionId
     */
    constructor(id: string) {
        this.id = id;
    }

    /**
     * 获取session值
     * @param key - 键
     * @returns     值或null
     */
    async get(key: string): Promise<unknown> {
        return await SessionFactory.cache.get(this.id, key);
    }

    /**
     * 设置session值
     * @param key -   键
     * @param value - 值
     */
    async set(key: string, value: unknown) {
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
     * 删除session值
     * @param key -   键
     */
    async del(key: string) {
        await SessionFactory.cache.del(this.id, key);
    }
}
