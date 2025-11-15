import { CacheItem, CacheOption } from "../../types/cachetypes";
import { NoomiError } from "../noomierror";
import { Util } from "../util";
import { MemoryItem } from "./memoryitem";

/**
 * 内存cache类
 * 用于管理内存存储相关对象
 * 
 * @public
 */
export class MemoryCache {
    /**
     * 缓存最大size
     */
    maxSize: number;
    /**
     * 附加size（对象）
     */
    extraSize: number;
    /**
     * 存储总map
     */
    storeMap: Map<string, object>;
    /**
     * 当前使用大小
     */
    size: number;

    /**
     * 构造器
     * @param cfg - cache配置项
     */
    constructor(cfg: CacheOption) {
        this.storeMap = new Map();
        this.maxSize = cfg.maxSize;
        this.size = 0;
    }

    /**
     * 往缓存中存值
     * @param item -      cache item
     * @param timeout -   超时时间
     */
    set(item: CacheItem, timeout?: number) {
        // 检查空间并清理
        this.checkAndClean(item);
        let ci: MemoryItem = <MemoryItem>this.storeMap.get(item.key);
        if (ci === undefined) {
            ci = new MemoryItem(timeout);
            this.storeMap.set(item.key, ci);
        }
        if (item.subKey) {// 子键
            if (ci.value) {
                // 如果key的value不是对象，不能设置subkey
                if (typeof ci.value !== 'object') {
                    throw new NoomiError("3010");
                }
            } else {
                ci.value = Object.create(null);
            }
            let v: string;
            // 转字符串
            if (typeof item.value === 'object') {
                v = JSON.stringify(item.value);
            } else {
                v = item.value + '';
            }
            // 保留原size
            const si: number = ci.size;
            if (ci.value[item.subKey]) {
                ci.size -= this.getRealSize(ci.value[item.subKey]);
            }
            ci.value[item.subKey] = v;
            ci.size += this.getRealSize(item.value);
            // 更新cache size
            this.size += ci.size - si;
        } else {
            const size: number = this.getRealSize(item.value);
            if (typeof item.value === 'object') {
                ci.size = size;
                // 新建value object
                if (!ci.value) {
                    ci.value = Object.create(null);
                }
                // 追加属性
                for (const k of Object.getOwnPropertyNames(item.value)) {
                    ci.value[k] = item.value[k];
                }
                this.size += size;
            } else {
                let si: number = 0;
                if (ci) {
                    // 保留原size
                    si = ci.size;
                } else {
                    ci = new MemoryItem(timeout);
                    this.storeMap.set(item.key, ci);
                }
                ci.size += size - si;
                ci.value = item.value;
                this.size += size - si;
            }
        }
    }

    /**
     * 从cache取值
     * @param key -           键
     * @param subKey -        子键
     */
    get(key: string, subKey?: string) {
        if (!this.storeMap.has(key)) {
            return null;
        }
        let mi: MemoryItem = <MemoryItem>this.storeMap.get(key);
        const ct: number = new Date().getTime();
        if (mi.expire > 0 && mi.expire < ct) {
            this.storeMap.delete(key);
            this.size -= mi.size;
            mi = null;
            return null;
        }
        this.changeLastUse(mi);
        if (subKey) {
            if (typeof mi.value === 'object') {
                return mi.value[subKey] || null;
            }
            return null;
        } else {
            return mi.value;
        }
    }

    /**
     * 获取map
     * @param key -     键
     * @returns         object或null
     */
    getMap(key: string): object {
        if (!this.storeMap.has(key)) {
            return null;
        }
        let mi: MemoryItem = <MemoryItem>this.storeMap.get(key);
        if (typeof mi.value !== 'object') {
            return null;
        }
        const ct: number = new Date().getTime();
        if (mi.expire > 0 && mi.expire < ct) {
            this.storeMap.delete(key);
            this.size -= mi.size;
            mi = null;
            return null;
        }
        this.changeLastUse(mi);
        return mi.value;
    }

    /**
     * 获取键数组
     * @param key -   键，可以带通配符
     * @returns     键名数组
     */
    getKeys(key: string): Array<string> {
        const reg: RegExp = Util.toReg(key);
        const arr: Array<string> = [];
        for (const k of this.storeMap.keys()) {
            if (reg.test(k)) {
                arr.push(k);
            }
        }
        return arr;
    }

    /**
     * 删除键
     * @param key -       键
     * @param subKey -    子键
     */
    del(key: string, subKey?: string) {
        let mi = <MemoryItem>this.storeMap.get(key);
        if (!mi) {
            return;
        }
        if (!subKey) {
            this.size -= mi.size;
            this.storeMap.delete(key);
            mi = null;
        } else { // 删除子键
            const v = mi.value[subKey];
            if (v) {
                mi.size -= this.getRealSize(v);
                delete mi.value[subKey];
            }
        }
    }

    /**
     * 是否存在键
     * @param key -   键
     * @returns      存在则返回true，否则返回false
     */
    has(key: string): boolean {
        return this.storeMap.has(key);
    }

    /**
     * 修改最后使用状态
     * @param item -              memory item
     * @param changeExpire -      释放修改expire
     */
    changeLastUse(item: MemoryItem, changeExpire?: boolean) {
        const ct: number = new Date().getTime();
        // 修改过期时间
        if (changeExpire && item.timeout) {
            item.expire = ct + item.timeout * 1000;
        }
        // 最大长度为5
        if (item.useRcds.length === 5) {
            item.useRcds.shift();
        }
        item.useRcds.push(ct);
        // 计算lru
        this.cacLRU(item);
    }

    /**
     * 获取值实际所占size
     * @param value -   待检测值
     * @returns         值所占空间大小
     */
    getRealSize(value: unknown): number {
        const tp = typeof value;
        switch (tp) {
            case 'string':
                return Buffer.byteLength(<string>value);
            case 'number':
                return 8;
            case 'boolean':
                return 2;
            case 'object':
                let len: number = 0;
                for (const p of Object.getOwnPropertyNames(value)) {
                    len += this.getRealSize(value[p]);
                }
                return len;
            default:
                return 4;
        }
    }

    /**
     * 清理缓存
     * @param size -  清理空间大小，为0仅清除超时元素，不设置表示全部清除
     */
    cleanup(size?: number) {
        // 无可清理对象
        if (this.storeMap.size === 0) {
            return;
        }
        if (size === undefined) { //全部清除
            this.storeMap.clear();
            return;
        }
        const ct = new Date().getTime();
        // 清理超时的
        for (const item of this.storeMap) {
            const key: string = item[0];
            let mi = <MemoryItem>item[1];
            if (mi.expire > 0 && mi.expire < ct) {
                this.storeMap.delete(key);
                this.size -= mi.size;
                size -= mi.size;
                mi = null;
            }
        }
        // 重复清理直到size符合要求
        while (size > 0) {
            size -= this.clearByLRU();
        }
    }

    /**
     * 通过lru进行清理
     * @returns      清理的尺寸
     */
    clearByLRU() {
        // 随机取m个，删除其中lru最小的n个
        const delArr: Array<{key,lru,size}> = [];
        const keys = this.storeMap.keys();
        // 避免 m > stormap.size
        const m = this.storeMap.size >= 10 ? 10 : this.storeMap.size;
        const n = 3;
        // 10个随机位置
        const indexes = [];
        for (let i = 0; i < m; i++) {
            indexes.push(this.storeMap.size * Math.random() | 0);
        }
        // 遍历，找到m个存储键
        for (let i = 0; i < this.storeMap.size; i++) {
            const k = keys.next();
            let ind;
            if ((ind = indexes.indexOf(i)) !== -1) {
                const d = <MemoryItem>this.storeMap.get(k.value);
                delArr.push({
                    key: k.value,
                    lru: d.LRU,
                    size: d.size
                });
                indexes.splice(ind, 1);
                if (indexes.length === 0) {
                    break;
                }
            }
        }
        // 降序排序
        delArr.sort((a, b) => {
            return b.lru - a.lru;
        });
        // 释放前n个
        let size: number = 0;
        for (let i = 0; i < n; i++) {
            size += delArr[i].size;
            this.storeMap.delete(delArr[i].key);
        }
        return size;
    }

    /**
     * 检查和清理空间
     * @param item -  cacheitem
     */
    checkAndClean(item: CacheItem) {
        const size: number = this.getRealSize(item.value);
        if (this.maxSize > 0 && size + this.size > this.maxSize) {
            this.cleanup(size + this.size - this.maxSize);
            if (size + this.size > this.maxSize) {
                throw new NoomiError("3002");
            }
        }
    }

    /**
     * 计算LRU
     * timeout 的权重为5（先保证timeout由时间去清理）
     * right = sum(1-(当前时间-使用记录)/当前时间) + timeout?5:0
     * @param item - 待计算的内存 item
     */
    cacLRU(item: MemoryItem) {
        const ct = new Date().getTime();
        let right: number = item.timeout > 0 ? 5 : 0;
        for (let i = 0; i < item.useRcds.length; i++) {
            right += 1 - (ct - item.useRcds[i]) / ct;
        }
        item.LRU = right;
    }
}
