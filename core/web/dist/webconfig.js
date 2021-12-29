"use strict";
exports.__esModule = true;
exports.WebConfig = void 0;
var webcache_1 = require("./webcache");
var errorfactory_1 = require("../tools/errorfactory");
var sessionfactory_1 = require("./sessionfactory");
var application_1 = require("../tools/application");
var pagefactory_1 = require("../tools/pagefactory");
var staticresource_1 = require("./staticresource");
var util_1 = require("../tools/util");
/**
 * web 配置类
 * @remarks
 * 用于管理web配置参数
 */
var WebConfig = /** @class */ (function () {
    function WebConfig() {
    }
    /**
     * 获取参数
     * @param name webconfig参数名
     */
    WebConfig.get = function (name) {
        if (!this.config || !this.config.hasOwnProperty(name)) {
            return null;
        }
        return this.config[name];
    };
    /**
     * 初始化
     * @param config 参阅web.json配置
     */
    WebConfig.init = function (config) {
        if (config.hasOwnProperty('web_config')) {
            var cfg = config['web_config'];
            if (cfg.cache === true) {
                var opt = cfg.cache_option;
                WebConfig.useServerCache = true;
                webcache_1.WebCache.init({
                    save_type: opt.save_type,
                    max_age: opt.max_age,
                    redis: opt.redis,
                    expires: opt.expires,
                    public: opt.public,
                    private: opt.private,
                    no_cache: opt.no_cache,
                    no_store: opt.no_store,
                    must_revalidation: opt.must_revalidation,
                    proxy_revalidation: opt.proxy_revalidation
                });
            }
            //static path
            if (cfg.hasOwnProperty('static_path')) {
                staticresource_1.StaticResource.addPath(cfg['static_path']);
            }
            this.cors = cfg['cors'];
            this.welcomePage = cfg['welcome'];
            this.config = cfg;
        }
        if (config.hasOwnProperty('session')) {
            sessionfactory_1.SessionFactory.init(config['session']);
        }
        //errorPage
        if (config.hasOwnProperty('error_page')) {
            this.setErrorPages(config['error_page']);
        }
        //https 配置
        if (config.hasOwnProperty('https')) {
            var opt = config['https'];
            if (opt['key_file'] && typeof opt['key_file'] === 'string' && opt['key_file'] !== ''
                && opt['cert_file'] && typeof opt['cert_file'] === 'string' && opt['cert_file'] !== '') {
                this.useHttps = true;
                this.httpsCfg = {
                    'only_https': opt['only_https'],
                    'key_file': util_1.Util.getAbsPath([opt['key_file']]),
                    'cert_file': util_1.Util.getAbsPath([opt['cert_file']])
                };
            }
        }
    };
    /**
     * @exclude
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    WebConfig.parseFile = function (path) {
        //读取文件
        var json;
        try {
            var jsonStr = application_1.App.fs.readFileSync(path, 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2100") + '\n' + e;
        }
        this.init(json);
    };
    /**
     * 设置异常页面
     * @param pages page配置数组[{code:http异常码,location:异常码对应页面地址(相对于项目根目录)}]
     */
    WebConfig.setErrorPages = function (pages) {
        if (Array.isArray(pages)) {
            pages.forEach(function (item) {
                //需要判断文件是否存在
                if (application_1.App.fs.existsSync(util_1.Util.getAbsPath([item['location']]))) {
                    pagefactory_1.PageFactory.addErrorPage(item['code'], item['location']);
                }
            });
        }
    };
    /**
     * 是否使用cache
     */
    WebConfig.useServerCache = false;
    return WebConfig;
}());
exports.WebConfig = WebConfig;
