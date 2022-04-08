/**
 * response回写配置项
 */
 interface IResponseWriteCfg{
    /**
     * 待写数据，可以是数据串或stream
     */
    data?:any; 
    /**
     * 字符集，默认utf8
     */             
    charset?:string;   

    /**
     * mime类型，默认text/html
     */
    type?:string;
    /**
     * http状态码，默认200
     */
    statusCode?:number;
    /**
     * 跨域配置串，多个域名用','分割，默认用webconfig中配置的网址数组，如果都没配置，则使用*
     */
    crossDomain?:string;    

    /**
     * 数据长度
     */
    size?:number;
    /**
     * 压缩类型，包括br,gzip,deflate
     */
    zip?:string;  

    /**
     * 回写类型  text,file 默认text
     * @since 0.4.7
     */
    writeType?:string;
}


/**
 * filter类型
 */
export interface IFilter{
    /**
     * 类
     */
    clazz:any;
    /**
     * 方法名
     */          
    method:string;
    /**
     * 正则表达式数组
     */
    patterns:Array<RegExp>; 
    /**
     * 优先级，越小越高，1-10为框架保留，默认10000
     */
    order:number;
}