import {InstanceFactory} from "../main/instancefactory";
import { HookItem } from "../types/other";

/**
 * 应用启动后钩子对象管理器
 * @remarks
 * 用于管理应用启动后的钩子函数及其调用
 */
export class LaunchHookManager {
    /**
     * hook实例数组
     */
    static hooks: Array<HookItem> = [];

    /**
     * 初始化
     * @param cfg - hook集
     */
    static init(cfg: HookItem) {
        if (!InstanceFactory.hasClass(cfg.clazz)) {
            InstanceFactory.addInstance(cfg.clazz);
        }
        this.hooks.push(cfg);
    }

    /**
     * 批量执行hook方法
     */
    static async run() {
        for (const h of this.hooks) {
            await InstanceFactory.exec(h.clazz, h.method, h.params);
        }
    }
}