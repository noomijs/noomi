import { WebCache } from "./webcache";
import { NoomiError } from "../tools/errorfactory";
import { SessionFactory } from "./sessionfactory";
import { App } from "../tools/application";
import { PageFactory } from "../tools/pagefactory";
import { StaticResource } from "./staticresource";

/**
 * web 配置
 */
export class WebConfig{
    static config:any;
    static useHttps:boolean;
    static useServerCache:boolean = false;
    static httpsCfg:object;
    /**
     * 获取参数
     * @param name 
     */
    static get(name:string){
        if(!this.config || !this.config.hasOwnProperty(name)){
            return null;
        }
        return this.config[name];
    }

    static init(config:any){
        if(config.hasOwnProperty('web_config')){
            let cfg:any = config['web_config'];
            //forbidden_path
            if(cfg.hasOwnProperty('forbidden_path')){
                StaticResource.addPath(config['forbidden_path']);
            }
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
                    'key_file':App.path.posix.join(process.cwd(),opt['key_file']),
                    'cert_file':App.path.posix.join(process.cwd(),opt['cert_file'])
                }; 
            }
        }
    }

    /**
     * 解析路由文件
     * @param path  文件路径
     * @param ns    命名空间，默认 /
     */
    static parseFile(path:string){
        //读取文件
        let json:any;
        try{
            let jsonStr:string = App.fs.readFileSync(App.path.posix.join(process.cwd(),path),'utf-8');
            json = App.JSON.parse(jsonStr);
        }catch(e){
            throw new NoomiError("2100") + '\n' + e;
        }
        this.init(json);
    }

    /**
     * 设置异常提示页面
     * @param pages page配置（json数组）
     */
    static setErrorPages(pages:Array<any>){
        if(Array.isArray(pages)){
            pages.forEach((item)=>{
                //需要判断文件是否存在
                if(App.fs.existsSync(App.path.posix.join(process.cwd(),item.location))){
                    PageFactory.addErrorPage(item.code,item.location);
                }
            });
        }
    }
    
}