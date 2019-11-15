"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const webcache_1 = require("./webcache");
const errorfactory_1 = require("../tools/errorfactory");
const sessionfactory_1 = require("./sessionfactory");
const application_1 = require("../tools/application");
const pagefactory_1 = require("../tools/pagefactory");
const staticresource_1 = require("./staticresource");
/**
 * web 配置
 */
class WebConfig {
    /**
     * 获取参数
     * @param name
     */
    static get(name) {
        if (!this.config || !this.config.hasOwnProperty(name)) {
            return null;
        }
        return this.config[name];
    }
    static init(config) {
        if (config.hasOwnProperty('web_config')) {
            let cfg = config['web_config'];
            //forbidden_path
            if (cfg.hasOwnProperty('forbidden_path')) {
                staticresource_1.StaticResource.addPath(config['forbidden_path']);
            }
            this.config = cfg;
            //cache
            if (cfg.cache === true) {
                let opt = cfg.cache_option;
                WebConfig.useServerCache = true;
                webcache_1.WebCache.init({
                    save_type: opt.save_type,
                    max_age: opt.max_age,
                    max_size: opt.max_size,
                    public: opt.public,
                    no_cache: opt.no_cache,
                    no_store: opt.no_store,
                    file_type: opt.file_type
                });
            }
        }
        if (config.hasOwnProperty('session')) {
            sessionfactory_1.SessionFactory.init(config['session']);
        }
        //errorPage
        if (config.hasOwnProperty('error_page')) {
            this.setErrorPages(config['error_page']);
        }
    }
    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path) {
        //读取文件
        let json;
        try {
            let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2100") + '\n' + e;
        }
        this.init(json);
    }
    /**
     * 设置异常提示页面
     * @param pages page配置（json数组）
     */
    static setErrorPages(pages) {
        if (Array.isArray(pages)) {
            pages.forEach((item) => {
                //需要判断文件是否存在
                if (application_1.App.fs.existsSync(application_1.App.path.posix.join(process.cwd(), item.location))) {
                    pagefactory_1.PageFactory.addErrorPage(item.code, item.location);
                }
            });
        }
    }
}
exports.WebConfig = WebConfig;
WebConfig.useServerCache = false;
//# sourceMappingURL=webconfig.js.map