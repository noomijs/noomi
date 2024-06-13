import {WebCache} from "./webcache";
import {NoomiError} from "../tools/noomierror";
import {SessionFactory} from "./sessionfactory";
import {App} from "../tools/application";
import {PageFactory} from "../tools/pagefactory";
import {StaticResource} from "./staticresource";
import {Util} from "../tools/util";
import { WebConfigOption, WebCorsOption, WebHttpsOption } from "../types/webtypes";

/**
 * web 配置类
 * @remarks
 * 用于管理web配置参数
 */
export class WebConfig {
    /**
     * 配置项
     */
    private static config: WebConfigOption;
    /**
     * 是否使用https
     */
    public static useHttps: boolean;
    /**
     * 是否使用cache
     */
    public static useServerCache: boolean = false;
    /**
     * https配置，useHttps为true时有效，包括：
     *  only_https:是否只采用https，如果为true，则不会启动http server，只启动https server
     *  key_file:私钥文件路径，相对于根目录
     *  cert_file:证书文件路径，相对与根目录
     */
    public static httpsCfg: WebHttpsOption;
    /**
     * 跨域设置
     */
    public static cors: WebCorsOption;
    /**
     * 欢迎页面，访问根目录时跳转到该页面
     */
    public static welcomePage: string;

    /**
     * 获取参数
     * @param name - webconfig参数名
     */
    public static get(name: string) {
        if (this.config && this.config.web_config) {
            return this.config.web_config[name];
        }
    }

    /**
     * 初始化
     * @param config - 参阅web.json配置
     */
    public static init(config: WebConfigOption) {
        if (config.hasOwnProperty('web_config')) {
            const cfg = config['web_config'];
            if (cfg.cache === true) {
                const opt = cfg.cache_option;
                WebConfig.useServerCache = true;
                WebCache.init({
                    save_type: opt.save_type||0,
                    max_age: opt.max_age||1800,
                    redis: opt.redis||'default',
                    expires: opt.expires||0,
                    public: opt.public||true,
                    private: opt.private||false,
                    no_cache: opt.no_cache||false,
                    no_store: opt.no_store||false,
                    must_revalidation: opt.must_revalidation||false,
                    proxy_revalidation: opt.proxy_revalidation||false
                });
            }
            // static path
            if (cfg.hasOwnProperty('static_path')) {
                StaticResource.addPath(cfg['static_path']);
            }
            this.cors = cfg['cors'];
            this.welcomePage = cfg['welcome'];
            this.config = config;
        }
        if (config.hasOwnProperty('session')) {
            SessionFactory.init(config['session']);
        }
        // errorPage
        if (config.hasOwnProperty('error_page')) {
            this.setErrorPages(config['error_page']);
        }
        // https 配置
        if (config.hasOwnProperty('https')) {
            const opt = config['https'];
            if (opt['key_file'] && typeof opt['key_file'] === 'string' && opt['key_file'] !== ''
                && opt['cert_file'] && typeof opt['cert_file'] === 'string' && opt['cert_file'] !== '') {
                this.useHttps = true;
                this.httpsCfg = {
                    'only_https': opt['only_https'],
                    'key_file': Util.getAbsPath([opt['key_file']]),
                    'cert_file': Util.getAbsPath([opt['cert_file']])
                };
            }
        }
    }

    /**
     * 解析路由文件
     * @param path -  文件路径
     */
    public static parseFile(path: string) {
        // 读取文件
        let json: WebConfigOption;
        try {
            const jsonStr: string = App.fs.readFileSync(path, 'utf-8');
            json = <WebConfigOption>Util.eval(jsonStr);
        } catch (e) {
            throw new NoomiError("2100") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 设置异常页面
     * @param pages - page配置数组
     * ```json
     *  [{
     *      code:http异常码,
     *      location:异常码对应页面地址(相对于项目根目录)
     *  }]
     * ```
     */
    private static setErrorPages(pages: Array<object>) {
        if (Array.isArray(pages)) {
            pages.forEach((item) => {
                // 需要判断文件是否存在
                if (App.fs.existsSync(Util.getAbsPath([item['location']]))) {
                    PageFactory.addErrorPage(item['code'], item['location']);
                }
            });
        }
    }
}