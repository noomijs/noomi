"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instancefactory_1 = require("../main/instancefactory");
const errorfactory_1 = require("../tools/errorfactory");
const util_1 = require("../tools/util");
const application_1 = require("../tools/application");
/**
 * 过滤器工厂类
 */
class FilterFactory {
    /**
     * 添加过滤器到工厂
     * @param name          过滤器名
     * @param instanceName  实例名
     */
    static addFilter(cfg) {
        let ins = cfg.instance || cfg.instance_name;
        let ptns = [];
        //默认 /*
        if (!cfg.url_pattern) {
            ptns = [/^\/*/];
        }
        else if (Array.isArray(cfg.url_pattern)) { //数组
            cfg.url_pattern.forEach((item) => {
                ptns.push(util_1.Util.toReg(item));
            });
        }
        else { //字符串
            ptns.push(util_1.Util.toReg(cfg.url_pattern));
        }
        //加入过滤器集合
        this.filters.push({
            instance: ins,
            method: cfg.method_name || 'do',
            patterns: ptns,
            order: cfg.order || 1000
        });
        this.filters.sort((a, b) => {
            return a.order - b.order;
        });
    }
    /**
     * 文件解析
     * @param path      filter的json文件
     */
    static parseFile(path) {
        //读取文件
        let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
        let json = null;
        try {
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2200") + '\n' + e;
        }
        this.init(json);
    }
    /**
     * 初始化
     * @param config
     */
    static init(config) {
        //处理filters
        if (Array.isArray(config.filters)) {
            config.filters.forEach((item) => {
                this.addFilter(item);
            });
        }
    }
    /**
     * 获取过滤器链
     * @param url   url
     * @returns     filter名数组
     */
    static getFilterChain(url) {
        let arr = [];
        this.filters.forEach((item) => {
            let reg;
            for (reg of item.patterns) {
                //找到匹配
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
     * @param url       url路径
     * @param request   httprequest
     * @param response  httpresponse
     * @param           promise boolean
     */
    static async doChain(url, request, response) {
        let arr = FilterFactory.getFilterChain(url);
        if (arr.length === 0) {
            return true;
        }
        //过滤器方法集合
        let methods = [];
        //根据过滤器名找到过滤器实例
        arr.forEach(item => {
            //可能是实例名，需要从实例工厂中获得
            let ins = typeof item.instance === 'string' ? instancefactory_1.InstanceFactory.getInstance(item.instance) : item.instance;
            if (!ins) {
                return;
            }
            if (typeof ins[item.method] === 'function') {
                methods.push(ins[item.method]);
            }
        });
        //全部通过才通过
        for (let i = 0; i < methods.length; i++) {
            if (!await methods[i](request, response)) {
                return false;
            }
        }
        return true;
    }
}
exports.FilterFactory = FilterFactory;
FilterFactory.filters = [];
//# sourceMappingURL=filterfactory.js.map