import {InstanceFactory} from "../main/instancefactory";
import {FilterOption} from "../types/types";
import {HttpRequest} from "./httprequest";
import {HttpResponse} from "./httpresponse";

/**
 * web后置处理，对web请求结果进行再处理
 * 如果处理方法返回为null，则处理链不再继续处理
 */
export class WebAfterHandler {
    /**
     * 过滤器实例数组
     */
    private static handlers: Array<FilterOption> = [];

    /**
     * 处理实例过滤器
     * @param cfg -  过滤器配置
     */
    public static addHandler(cfg: FilterOption) {
        // 如果类未添加到实例工厂，则添加
        if (!InstanceFactory.hasClass(cfg.clazz)) {
            InstanceFactory.addInstance(cfg.clazz);
        }
        cfg.order = cfg.order || 10000;
        if (!Array.isArray(cfg.patterns)) {
            cfg.patterns = [cfg.patterns];
        }
        // 加入过滤器集合
        this.handlers.push(cfg);
        // 排序
        this.handlers.sort((a, b) => {
            return a.order - b.order;
        });
    }

    /**
     * 获取过滤器链
     * @param url -   资源url
     * @returns     filter数组
     */
    private static getHandlerChain(url: string): Array<FilterOption> {
        const arr: Array<FilterOption> = [];
        this.handlers.forEach((item: FilterOption) => {
            let reg: RegExp;
            for (reg of item.patterns) {
                // 找到匹配
                if (reg.test(url)) {
                    arr.push(item);
                    return;
                }
            }
        });
        return arr;
    }

    /**
     * 执行过滤器链
     * @param url -     url路径
     * @param result -  处理结果
     * @param request - request 对象
     * @param response -response 对象
     * @returns         处理结果进行方法链处理，返回最后的处理结果
     */
    public static async doChain(url: string, result: unknown, request: HttpRequest, response: HttpResponse): Promise<unknown> {
        const arr: Array<FilterOption> = WebAfterHandler.getHandlerChain(url);
        if (arr.length === 0) {
            return result;
        }
        for (const item of arr) {
            const ins = InstanceFactory.getInstance(item.clazz);
            if (!ins) {
                continue;
            }
            if (typeof ins[item.method] === 'function') {
                // 处理结果为null，表示不继续执行方法链
                result = await InstanceFactory.exec(ins, item.method, [result, request, response]);
                if (result === null) {
                    return null;
                }
            }
        }
        return result;
    }
}