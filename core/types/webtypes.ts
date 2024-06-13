import { Stream } from "stream";

/**
 * web缓存配置
 */
export type WebCacheOption = {
    /**
     * 存储类型
     * @remarks
     * 值：0 memory(默认), 1 redis(需要安装redis服务器并启动redis服务)
     */
    save_type?:number;
    /**
     * 缓存最大字节数
     * @remarks
     * save_type为0时有效，单位 字节
     */
    max_size?:number;
    /**
     * 单个缓存文件最大size
     * @remarks
     * 0表示不限制，默认0
     */
    max_single_size?:number;
    /**
     * redis client名
     * @remarks
     * 与redis配置文件保持一直，默认`default`
     */ 
    redis?:string;
    /**
     * 页面缓存 expires 属性
     * @remarks
     * 单位 分，默认0
     */
    expires?:number;
    /**
     * cache-control中的max-age属性
     * @remarks
     * 单位 秒
     */
    max_age?:number;
    /**
     * cache-control中的public属性
     * @remarks
     * 优先级高于private配置，即public和private同时为true时，设置public
     */
    public?:boolean;
    /**
     * cache-control中的private属性
     */			
    private?:boolean;
    /**
     * cache-control中的no-cache属性
     */
    no_cache?:boolean;
    /**
     * cache-control中的no-store属性
     */
    no_store?:boolean;
    /**
     * cache-control中的must-revalidation属性
     */
    must_revalidation?:boolean;
    /**
     * cache-control中的proxy-revalidation属性
     */
    proxy_revalidation?:boolean;
}

/**
 * web跨域配置项
 */
export type WebCorsOption = {
    /**
     * 域设置
     */
    domain:string,             
    /**
     * 自定义header，多个以","分割，method=options时有效
     */
    allow_headers:string,
    /**
     * 结果缓存时间(秒)，默认24小时 24*3600
     */
    access_max_age:string      
}

/**
 * web异常页面配置项
 * @remarks
 * 如果http异常码在该配置中，则重定向到该异常码对应的页面
 * 如403，404异常码配置
 */
export type WebErrorPageOption={
    /**
     * 异常码，类型：数字
     */
    code:number;
    /**
     * 页面地址
     * @remarks
     * 相对于项目跟路径，以/开始，如`/pages/error/404.html`
     */
    location:string;
}

/**
 * session 配置项
 */
export type SessionOption={
    /**
     * set-cookie中的sessionId名
     * @remarks
     * 默认为`NSESSIONID`
     */
    name:string;
    /**
     * session超时时间
     * @remarks
     * 单位:分钟，默认30
     */
    timeout:number;
    /**
     * 存储类型
     * @remarks
     * 0 memory（默认）, 1 redis，需要安装redis服务器并启动服务
     */
    save_type:number;
    /**
     * 缓存最大字节数
     * @remarks
     * save_type为0时有效
     */
    max_size:number;
    /**
     * redis client名
     * @remarks
     * 与redis配置保持一直，默认`default`
     */
    redis:string;
}

/**
 * https配置项
 */
export type WebHttpsOption={
    /**
     * 是否只采用https
     * @remarks
     * 如果为true，则不会启动http server，默认false
     */ 
    only_https:boolean;
    /**
     * 私钥文件路径
     * @remarks
     * 相对于根目录，如`/sslkey/noomiprivatekey.pem`。
     */
    key_file:string;
    /**
     * 证书文件路径
     * @remarks
     * 相对于根目录，如`/sslkey/noomicertificate.pem`。
     */ 
    cert_file:string;
}

/**
 * web配置项
 */
export type WebConfigOption={
    /**
     * 网络配置
     */
    web_config:{
        /**
         * 临时上传目录
         * @remarks
         * 默认 `/upload/tmp`
         */
        upload_tmp_dir?:string;
        /**
         * 上传内容最大字节数
         * @remarks
         * 默认0，不限制
         */
        upload_max_size?:number;
        /**
         * 静态资源路径
         * @remarks
         * 如果不设置，则将以动态路由方式访问静态资源，会造成性能下降
         */
        static_path?:string[];
        /**
         * 欢迎页面url
         * @remarks
         * 设置后，如果网址中不指定资源，则会默认跳转到此页面
         */
        welcome?:string;
        /**
         * 跨域
         * @remarks
         * 如果不允许跨域，可不设置
         */
        cores?:WebCorsOption;
        /**
         * 是否启用静态资源缓存
         * @remarks
         * 如果为false，则cache_option无效，默认false
         */
        cache:boolean;				
        /**
         * 静态资源缓存配置
         * @remarks
         * 如果不缓存，则不用设置
         */
        cache_option?:WebCacheOption;
    }
    /**
     * session配置
     */ 
    session?:SessionOption,

    /**
     * http异常页配置
     */
    error_page?:WebErrorPageOption[];

    /**
     * https 配置
     */ 
    https?:WebHttpsOption;
}


/**
 * response回写配置项
 */
export type ResponseWriteCfg = {
    /**
     * 待写数据，可以是数据串或stream
     */
    data?: string|Stream;
    /**
     * 字符集，默认utf8
     */
    charset?: string;
    /**
     * mime类型，默认text/html
     */
    type?: string;
    /**
     * http状态码，默认200
     */
    statusCode?: number;
    /**
     * 跨域配置串，多个域名用','分割，默认用webconfig中配置的网址数组，如果都没配置，则使用*
     */
    crossDomain?: string;
    /**
     * 数据长度
     */
    size?: number;
    /**
     * 压缩类型，包括br,gzip,deflate
     */
    zip?: string;
    /**
     * 回写类型  text,file 默认text
     */
    writeType?: string;
}

/**
 * 静态资源缓存项
 */
export type WebCacheItem = {
    /**
     * ETag
     */
    etag?: string;
    /**
     * 最后修改时间串
     */
    lastModified?: string;
    /**
     * 文件mime type
     */
    mimeType: string;
    /**
     * 数据长度
     */
    dataSize?: number;
    /**
     * 压缩数据长度
     */
    zipSize?: number;
    /**
     * 数据
     */
    data?: string;
    /**
     * 压缩数据
     */
    zipData?: string;
}

/**
 * http content type 配置项
 */
export type ContentTypeOption = {
    /**
     * 域分隔线
     */
    bundary?:string;
    /**
     * 字符集
     */
    charset?:string;
    /**
     * 类型
     */
    type?:string;
}

/**
 * response回写配置项
 */
export type ResponseWriteOption = {
    /**
     * 待写数据，可以是数据串或stream
     */
    data?: string|Stream;
    /**
     * 字符集，默认utf8
     */
    charset?: string;
    /**
     * mime类型，默认text/html
     */
    type?: string;
    /**
     * http状态码，默认200
     */
    statusCode?: number;
    /**
     * 跨域配置串，多个域名用','分割，默认用webconfig中配置的网址数组，如果都没配置，则使用*
     */
    crossDomain?: string;
    /**
     * 数据长度
     */
    size?: number;
    /**
     * 压缩类型，包括br,gzip,deflate
     */
    zip?: string;
    /**
     * 回写类型  text,file 默认text
     */
    writeType?: string;
}


/**
 * filter类型
 */
export type FilterOption = {
    /**
     * 类
     */
    clazz: unknown;
    
    /**
     * 方法名
     */
    method: string;
    
    /**
     * 正则表达式数组
     */
    patterns: RegExp[];

    /**
     * 优先级，越小越高，1-10为框架保留，默认10000
     */
    order: number;
}