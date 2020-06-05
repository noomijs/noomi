import { WebCache } from "./webcache";
import { NoomiError } from "../tools/errorfactory";
import { SessionFactory } from "./sessionfactory";
import { App } from "../tools/application";
import { PageFactory } from "../tools/pagefactory";
import { StaticResource } from "./staticresource";
import { Util } from "../tools/util";

/**
 * web 配置类
 * @remarks
 * 用于管理web配置参数
 */
export class WebConfig{
    /**
     * 配置项
     */
    static config:any;
    /**
     * 是否使用https
     */
    static useHttps:boolean;
    /**
     * 是否使用cache
     */
    static useServerCache:boolean = false;
    /**
     * https配置，useHttps为true时有效，包括：
     *  only_https:是否只采用https，如果为true，则不会启动http server，只启动https server
     *  key_file:私钥文件路径，相对于根目录
     *  cert_file:证书文件路径，相对与根目录
     */
    static httpsCfg:object;
    /**
     * 跨域设置
     */
    static cors:object;
    /**
     * 欢迎页面，访问根目录时跳转到该页面
     */
    static welcomePage:string;

    /**
     * 获取参数
     * @param name webconfig参数名
     */
    static get(name:string){
        if(!this.config || !this.config.hasOwnProperty(name)){
            return null;
        }
        return this.config[name];
    }

    /**
     * 初始化
     * @param config 参阅web.json配置 
     */
    static init(config:any){
        if(config.hasOwnProperty('web_config')){
            let cfg:any = config['web_config'];
            //static path
            if(cfg.hasOwnProperty('static_path')){
                StaticResource.addPath(cfg['static_path']);
            }
            this.cors = cfg['cors'];
            this.welcomePage = cfg['welcome'];
            this.config = cfg;
            //cache
            if(cfg.cache === true){
                let opt = cfg.cache_option;
                WebConfig.useServerCache = true;
                WebCache.init({
                    save_type:opt.save_type,
                    max_age:opt.max_age,
                    max_size:opt.max_size,
                    max_single_size:opt.max_single_size,
                    public:opt.public,
                    no_cache:opt.no_cache,
                    no_store:opt.no_store,
                    file_type:opt.file_type
                });
            }
        }

        if(config.hasOwnProperty('session')){
            SessionFactory.init(config['session']);    
        }

        //errorPage
        if(config.hasOwnProperty('error_page')){
            this.setErrorPages(config['error_page']);
        }

        //https 配置
        if(config.hasOwnProperty('https')){
            let opt = config['https'];
            if(opt['key_file'] && typeof opt['key_file'] === 'string' && opt['key_file'] !== ''
               && opt['cert_file'] && typeof opt['cert_file'] === 'string' && opt['cert_file'] !== ''){
                this.useHttps = true;
                this.httpsCfg = {
                    'only_https':opt['only_https'],
                    'key_file':Util.getAbsPath([opt['key_file']]),
                    'cert_file':Util.getAbsPath([opt['cert_file']])
                }; 
            }
        }
    }

    /**
     * @exclude
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path:string){
        //读取文件
        let json:any;
        try{
            let jsonStr:string = App.fs.readFileSync(path,'utf-8');
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2100") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 设置异常页面
     * @param pages page配置数组[{code:http异常码,location:异常码对应页面地址(相对于项目根目录)}]
     */
    static setErrorPages(pages:Array<object>){
        if(Array.isArray(pages)){
            pages.forEach((item)=>{
                //需要判断文件是否存在
                if(App.fs.existsSync(Util.getAbsPath([item['location']]))){
                    PageFactory.addErrorPage(item['code'],item['location']);
                }
            });
        }
    }
}