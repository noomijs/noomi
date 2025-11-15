/**
 * cookie类
 * @remarks
 * 用于response操作cookie
 * 
 * @public
 */
export class HttpCookie {
    /**
     * cookie name
     */
    private name:string;

    /**
     * cookie 值
     */
    private value:string;

    /**
     * cookie 过期时间
     */
    private expires:String;

    /**
     * cookie 的有效期（秒数），优先级高于 Expires
     */
    private maxAge:number;

    /**
     * 指定哪些域名会携带此 Cookie（默认当前域名，不包含子域名)
     */
    private domain:string;

    /**
     * 限制 Cookie 仅在指定路径下生效（默认 /，即全站有效）
     */
    private path:string = '/';

    /**
     * 禁止 JavaScript 通过 document.cookie 访问（防 XSS 攻击），默认false
     */
    private httpOnly:boolean = false;

    /**
     * 仅通过 HTTPS 协议发送 Cookie（防止中间人窃取），默认false
     */
    private secure:boolean = false;

    /**
     * 控制跨站请求时是否发送 Cookie（防 CSRF 攻击
     *   Strict: 仅同站请求
     *   Lax: 允许部分安全跨站请求（如导航链接，默认）
     *   None: 允许跨站（需配合 Secure）
     */
    private sameSite:string;
    /**
     * 构造器
     * @param name -    cookie name
     * @param value -   name 对应值
     */
    constructor(name:string,value:string) {
        this.name = name;
        this.value = value;    
    }

    /**
     * 获取cookie name
     * @returns     cookie name
     */
    public getName(){
        return this.name;
    }
    /**
     * 获取cookie值
     * @returns     cookie值
     */
    public getValue(){
        return this.value;
    }

    /**
     * 设置expires
     * @param date -    date 
     */
    public setExpires(date:Date){
        this.expires = date.toUTCString();
    }

    /**
     * 设置maxage
     * @param v -   maxage属性
     */
    public setMaxAge(v:number){
        this.maxAge = v;
    }

    /**
     * 设置domain属性
     * @param v -   domain值
     */
    public setDomain(v:string){
        this.domain = v;
    }

    /**
     * 设置path 属性
     * @param v -   path属性，如/api
     */
    public setPath(v:string){
        this.path = v;
    }
    /**
     * 设置http only
     * @param v -   value
     */
    public setHttpOnly(v:boolean){
        this.httpOnly = v;
    }

    /**
     * 设置secure属性
     * @param v -   value
     */
    public setSecure(v:boolean){
        this.secure = v;
    }

    /**
     * 获取cookie串
     * @returns     response header string
     */
    public toHeaderString():string{
        const a = [this.name + '=' + this.value];
        if(this.expires){
            a.push('Expires=' + this.expires);
        }
        if(this.maxAge){
            a.push('Max-Age=' + this.maxAge);
        }
        if(this.httpOnly){
            a.push('HttpOnly');
        }
        if(this.secure){
            a.push('Secure');
        }
        if(this.domain){
            a.push('Domain=' + this.domain);
        }
        if(this.path){
            a.push('Path=' + this.path);
        }
        if(this.sameSite){
            a.push('SaveSite=' + this.sameSite);
        }
        return a.join('; ');
    }
}