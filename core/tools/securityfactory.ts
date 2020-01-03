import { HttpRequest } from "../web/httprequest";
import { InstanceFactory } from "../main/instancefactory";
import { SecurityFilter } from "../web/filter/securityfilter";
import { NoomiError } from "./errorfactory";
import { NCache } from "./ncache";
import { Session,SessionFactory } from "../web/sessionfactory";
import { DBManager } from "../database/dbmanager";
import { ConnectionManager } from "../database/connectionmanager";
import { App } from "./application";
import { FilterFactory } from "../web/filterfactory";

/**
 * resource 对象
 */
// interface ResourceObj{
//     /**
//      * 资源url
//      */
//     url:string;          
//     /**
//      * 组id列表
//      */      
//     auths:Array<number>; 
// }

/**
 * 安全工厂
 * @remarks
 * 用于管理安全对象
 */
class SecurityFactory{
    /**
     * @exclude
     * 存储在session中的名字
     */
    static sessionName:string = 'NOOMI_SECURITY_OBJECT';
    /**
     * 数据表对象
     */
    static dbOptions:any;
    /**
     * 认证类型 0 session 1 token
     */
    static authType:number = 0;  
    /**
     * 数据存储类型，0内存 1redis
     */
    static saveType:number = 0;  
    /**
     * redis名，必须在redis.json中已定义,saveType=1时有效
     */
    static redis:string='default'; 
    /**
     * 最大size,saveType=0时有效
     */
    static maxSize:number;
    /**
     * 缓存对象 
     */          
    static cache:NCache;
    /**
     * 安全相关页面map
     */
    static securityPages:Map<string,string> = new Map();
    
    //资源列表
    // static resources:Map<number,ResourceObj> = new Map();
    /**
     * 登录用户map
     */
    static users:Map<number,Array<number>> = new Map(); 
    /**
     * 组map
     */
    static groups:Map<number,Array<number>> = new Map();
    /**
     * @exclude
     * 缓存时用户key前缀
     */
    static USERKEY:string = 'USER';
    /**
     * @exclude
     * 缓存时组key前缀
     */
    static GROUPKEY:string = 'GROUP';
    /**
     * @exclude
     * 缓存时资源key前缀
     */
    static RESKEY:string = 'RESOURCE';
    /**
     * @exclude
     * 用户id对应session键
     */
    static USERID:string='NSECURITY_USERID';     
    /**
     * 认证前url在session中的名字 
     */                   
    static PRELOGIN:string='NSECURITY_PRELOGIN'; 

    /**
     * users在cache的key
     */
    static redisUserKey:string = "NOOMI_SECURITY_USERS"; 
    /**
     * groups在cache的key
     */
    static redisGroupKey:string = "NOOMI_SECURITY_GROUPS";
    /**
     * resource在cache的key
     */
    static redisResourceKey:string = "NOOMI_SECURITY_RESOURCES"; 

    /**
     * 初始化配置
     * @config   配置项
     */
    static async init(config){
        //鉴权失败页面
        if(config.hasOwnProperty('auth_fail_url')){
            this.securityPages.set('auth_fail_url',config['auth_fail_url']);
        }

        //登录页面
        if(config.hasOwnProperty('login_url')){
            this.securityPages.set('login_url',config['login_url']);
        }

        if(config.hasOwnProperty('auth_type')){
            this.authType = config['auth_type'];
        }

        if(config.hasOwnProperty('save_type')){
            this.saveType = config['save_type'];
        }

        if(config.hasOwnProperty('redis')){
            this.redis = config['redis'];
        }

        if(config.hasOwnProperty('max_size')){
            this.maxSize = config['max_size'];
        }

        //数据库解析
        if(config.hasOwnProperty('dboption')){
            this.dbOptions = config.dboption;
        }
        //初始化security filter
        InstanceFactory.addInstance({
            name:'NoomiSecurityFilter',         //filter实例名
            instance:new SecurityFilter(),
            class:SecurityFilter
        });
        
        FilterFactory.addFilter({
            instance_name:'NoomiSecurityFilter',
            url_pattern:config['expressions'],
            order:1
        });

        //创建cache
        this.cache = new NCache({
            name:'NSECURITY',
            saveType:this.saveType,
            maxSize:this.maxSize,
            redis:this.redis
        });
        
        //初始化表名和字段名
        let tResource:string;
        let tGroupAuth:string;
        let tResourceAuth:string;
        let authId:string;
        let groupId:string;
        let resourceId:string;
        let resourceUrl:string;
        
        if(this.dbOptions){
            if(this.dbOptions.tables){
                tResource = this.dbOptions.tables['resource'];
                tGroupAuth = this.dbOptions.tables['groupAuthority'] ;
                tResourceAuth = this.dbOptions.tables['resourceAuthority']; 
            }
    
            if(this.dbOptions.columns){
                authId = this.dbOptions.columns['authorityId'];
                groupId = this.dbOptions.columns['groupId'];
                resourceId = this.dbOptions.columns['resourceId'];
                resourceUrl = this.dbOptions.columns['resourceUrl'];
            }
        }
        
        let ids = {
            tGroupAuth:tGroupAuth || "t_group_authority",
            tResource:tResource || "t_resource",
            tResourceAuth:tResourceAuth || "t_resource_authority",
            authId:authId || "authority_id",
            groupId:groupId || "group_id",
            resourceId:resourceId || "resource_id",
            resourceUrl:resourceUrl || "url"
        }
        
        let results:Array<any>;
        let product:string = this.dbOptions.product || DBManager.product;
        let connCfg = this.dbOptions?this.dbOptions.conn_cfg:null;
        //从表中加载数据
        switch(product){
            case "mysql":
                results = await handleMysql(connCfg,ids);
                break;
            case "mssql":
                results = await handleMssql(connCfg,ids);
                break;
            case "oracle":
                results = await handleOracle(connCfg,ids);
                break;
        }
        //组权限
        let gaMap:Map<number,Array<number>> = new Map(); //{groupdId1:[authId1,authId2,..],...}
        for(let r of results[0]){
            let aids:Array<number>;
            if(gaMap.has(r.gid)){
                aids = gaMap.get(r.gid); 
            }else{
                aids = [];
            }
            aids.push(r.aid);
            gaMap.set(r.gid,aids);
        }
        //更新组权限
        for(let p of gaMap){
            await this.updGroupAuths(p[0],p[1]);
        }
        
        //资源
        for(let r of results[1]){
            let a = [];
            for(let r1 of results[2]){
                if(r1.rid === r.rid){
                    let aid = r1.aid;
                    if(a.includes(aid)){
                        continue;
                    }
                    a.push(aid);
                }
            }
            await this.updResourceAuths(r.url,a);
        }

        /**
         * 处理mysql
         * @param cfg 
         */
        async function handleMysql(cfg:any,ids:any):Promise<Array<any>>{
            let conn;
            let arr:Array<any> = [];
            let cm:ConnectionManager = null;
            try{
                if(!cfg){ //cfg为空，直接使用dbmanager的connection manager
                    cm = DBManager.getConnectionManager();
                    if(!cm){
                        throw new NoomiError("2800");
                    }
                    conn = await cm.getConnection();
                }else{    
                    conn = require('mysql').createConnection(cfg);
                    await conn.connect();
                }
                //组权限
                let results:Array<any> = await new Promise((resolve,reject)=>{
                    conn.query("select " + ids.groupId + "," + ids.authId + " from " + ids.tGroupAuth,
                    (error,results,fields)=>{
                        if(error){
                            reject(error);
                        }
                        resolve(results);
                    });
                });
                let a:Array<any> = [];
                for(let r of results){
                    a.push({
                        gid:r[ids.groupId],
                        aid:r[ids.authId]
                    });
                }
                arr.push(a);

                //资源
                results = await new Promise((resolve,reject)=>{
                    conn.query("select " + ids.resourceId + "," + ids.resourceUrl + " from " + ids.tResource,
                    (error,results,fields)=>{
                        if(error){
                            reject(error);
                        }
                        resolve(results);
                    });
                });
                let a1:Array<any> = [];
                for(let r of results){
                    a1.push({
                        rid:r[ids.resourceId],
                        url:r[ids.resourceUrl]
                    });
                }
                arr.push(a1);
                
                //资源权限
                results = await new Promise((resolve,reject)=>{
                    conn.query("select " + ids.resourceId + "," + ids.authId + " from " + ids.tResourceAuth,
                    (error,results,fields)=>{
                        if(error){
                            reject(error);
                        }
                        resolve(results);
                    });
                });
                let a2:Array<any> = [];
                for(let r of results){
                    a2.push({
                        rid:r[ids.resourceId],
                        aid:r[ids.authId]
                    });
                }
                arr.push(a2);
            }catch(e){
                throw e;
            }finally{
                //关闭连接
                if (conn) {
                    if(cm !== null){
                        await cm.release(conn);
                    }else{
                        try {
                            conn.end();
                        } catch (err) {
                            throw err;
                        }
                    }
                }
            }
            return arr;
        }

        /**
         * 处理mssql
         * @param cfg 
         * @param ids 
         */
        async function handleMssql(cfg:any,ids:any):Promise<Array<any>>{
            let conn;
            let arr:Array<any> = [];
            let cm:ConnectionManager = null;
            if(!cfg){
                cm = DBManager.getConnectionManager();
                if(!cm){
                    throw new NoomiError("2800");
                }
                conn = await cm.getConnection();
            }else{
                conn = await require('mssql').getConnection(cfg);
            }
            try{
                //组权限
                let result = await conn.query("select " + ids.groupId + "," + ids.authId + " from " + ids.tgroupauth);
                let a:Array<any> = [];
                for(let r of result.recordset){
                    a.push({
                        gid:r[ids.groupId],
                        aid:r[ids.authId]
                    });
                }
                arr.push(a);
                //资源
                result = await conn.query("select " + ids.resourceId + "," + ids.resourceUrl + " from " + ids.tresource);
                let a1:Array<any> = [];
                for(let r of result.recordset){
                    a1.push({
                        rid:r[ids.resourceId],
                        url:r[ids.resourceUrl]
                    });
                }
                arr.push(a1);
                //资源权限
                result  = await conn.query("select " + ids.resourceId + "," + ids.authId + " from " + ids.tresourceauth);

                let a2:Array<any> = [];
                for(let r of result.recordset){
                    a2.push({
                        rid:r[ids.resourceId],
                        aid:r[ids.authId]
                    });
                }
                arr.push(a2);
                
            }catch(e){
                throw e;
            }finally{
                //关闭连接
                if (conn) {
                    if(cm !== null){
                        await cm.release(conn);
                    }else{
                        try {
                            conn.close();
                        } catch (err) {
                            throw err;
                        }
                    }
                }
            }
            return arr;
        }

        /**
         * 处理oracle
         * @param cfg 
         * @param ids 
         */
        async function handleOracle(cfg:any,ids:any):Promise<Array<any>>{
            let conn;
            let arr:Array<any> = [];
            let cm:ConnectionManager = null;
            if(!cfg){
                cm = DBManager.getConnectionManager();
                if(!cm){
                    throw new NoomiError("2800");
                }
                conn = await cm.getConnection();
            }else{
                conn = await require('oracledb').getConnection(cfg);
            }
            
            try{
                //组权限
                let result = await conn.execute("select " + ids.groupId + "," + ids.authId + " from " + ids.tgroupauth);
                let a:Array<any> = [];
                for(let r of result.rows){
                    a.push({
                        gid:r[0],
                        aid:r[1]
                    });
                }
                arr.push(a);
                //资源
                result = await conn.execute("select " + ids.resourceId + "," + ids.resourceUrl + " from " + ids.tresource);
                let a1:Array<any> = [];
                for(let r of result.rows){
                    a1.push({
                        rid:r[0],
                        url:r[1]
                    });
                }
                arr.push(a1);
                //资源权限
                result  = await conn.execute("select " + ids.resourceId + "," + ids.authId + " from " + ids.tresourceauth);

                let a2:Array<any> = [];
                for(let r of result.rows){
                    a2.push({
                        rid:r[0],
                        aid:r[1]
                    });
                }
                arr.push(a2);
            }catch(e){
                throw e;
            }finally{
                //关闭连接
                if (conn) {
                    if(cm !== null){
                        await cm.release(conn);
                    }else{
                        try {
                            await conn.close();
                        } catch (err) {
                            throw err;
                        }
                    }
                }
            }
            return arr;
        }
    }

    /**
     * 添加用户组
     * @param userId    用户id
     * @param groupId   组id
     */
    static async addUserGroup(userId:number,groupId:number){
        let key:string = this.USERKEY + userId;
        let s = await this.cache.get(key);
        let arr:Array<number>;
        if(s !== null){
            arr = JSON.parse(s);
        }else{
            arr = [];
        }
        if(arr.includes(groupId)){
            return;
        }
        arr.push(groupId);
        await this.cache.set({
            key:key,
            value:JSON.stringify(arr)
        });
    }

    /**
     * 添加用户组(多个组)
     * @param userId    用户id
     * @param groups    组id 数组
     */
    static async addUserGroups(userId:number,groups:Array<number>,request?:HttpRequest){
        //保存userId 到session object
        if(request){
            let session:Session = await SessionFactory.getSession(request);
            if(session){
                await session.set(this.USERID,userId);
            }
        }
        //保存用户组
        await this.cache.set({
            key:this.USERKEY + userId,
            value:JSON.stringify(groups)
        });
    }
    /**
     * 添加组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static async addGroupAuthority(groupId:number,authId:number){
        let key:string = this.GROUPKEY + groupId;
        let s = await this.cache.get(key);
        let arr:Array<number>;
        if(s !== null){
            arr = JSON.parse(s);
        }else{
            arr = [];
        }
        if(arr.includes(authId)){
            return;
        }
        arr.push(authId);
        await this.cache.set({
            key:key,
            value:JSON.stringify(arr)
        });
    }

    /**
     * 更新组权限
     * @param groupId   组id
     * @param authIds   权限id数组
     */
    static async updGroupAuths(groupId:number,authIds:Array<number>){
        let key:string = this.GROUPKEY + groupId;
        await this.cache.del(key);
        await this.cache.set({
            key:key,
            value:JSON.stringify(authIds)
        });
    }

    /**
     * 添加资源权限
     * @param url       资源url
     * @param authId    权限id
     */
    static async addResourceAuth(url:string,authId:number){
        let key:string = this.RESKEY + url;
        let s = await this.cache.get(key);
        let arr:Array<number>;
        if(s !== null){
            arr = JSON.parse(s);
        }else{
            arr = [];
        }
        if(arr.includes(authId)){
            return;
        }
        arr.push(authId);
        await this.cache.set({
            key:key,
            value:JSON.stringify(arr)
        });
    }

    /**
     * 添加资源权限(多个权限)
     * @param url       资源id
     * @param auths     权限id数组
     */
    static async updResourceAuths(url:string,auths:Array<number>){
        let key:string = this.RESKEY + url;
        await this.cache.del(key);
        let s = await this.cache.set({
            key:key,
            value:JSON.stringify(auths)
        });
    }

    /**
     * 删除用户
     * @param userId    用户id 
     * @param request   request对象
     */
    static async deleteUser(userId:number,request?:HttpRequest){
        //保存userId 到session object
        if(request){
            let session:Session = await SessionFactory.getSession(request);
            if(session){
                await SessionFactory.delSession(session.id);
            }
        }
        //从cache删除
        this.cache.del(this.USERKEY + userId);
    }

    /**
     * 删除用户组
     * @param userId    用户id 
     * @param groupId   组id
     */
    static async deleteUserGroup(userId:number,groupId:number){
        let key:string = this.USERKEY + userId;
        let astr:string = await this.cache.get(key);
        if(astr === null){
            return;
        }
        let a:Array<number> = JSON.parse(astr);
        if(!a.includes(groupId)){
            return;
        }
        a.splice(a.indexOf(groupId),1);
        await this.cache.set({
            key:key,
            value:JSON.stringify(a)
        });
    }

    /**
     * 删除组     
     * @param groupId   组id 
     */
    static async deleteGroup(groupId:number){
        await this.cache.del(this.GROUPKEY+groupId);
    }

    /**
     * 删除组权限
     * @param groupId   组id 
     * @param authId    权限id
     */
    static async deleteGroupAuthority(groupId:number,authId:number){
        let key:string = this.GROUPKEY + groupId;
        let astr:string = await this.cache.get(key);
        if(astr === null){
            return;
        }
        let a:Array<number> = JSON.parse(astr);
        if(!a.includes(authId)){
            return;
        }
        a.splice(a.indexOf(authId),1);
        await this.cache.set({
            key:key,
            value:JSON.stringify(a)
        });
    }

    /**
     * 删除资源     
     * @param resourceId   资源id 
     */
    static async deleteResource(url:string){
        await this.cache.del(this.RESKEY + url);
    }

    /**
     * 删除资源权限
     * @param resourceId     资源id 
     * @param authId    权限id
     */
    static async deleteResourceAuthority(url:string,authId:number){
        let key:string = this.RESKEY + url;
        let astr:string = await this.cache.get(key);
        if(astr === null){
            return;
        }
        let a:Array<number> = JSON.parse(astr);
        if(!a.includes(authId)){
            return;
        }
        a.splice(a.indexOf(authId),1);
        await this.cache.set({
            key:key,
            value:JSON.stringify(a)
        });
    }

    /**
     * 删除权限
     * @param authId    权限Id
     */
    static async deleteAuthority(authId:number){
        //遍历资源权限并清除
        let arr:Array<string> = await this.cache.getKeys(this.RESKEY + '*');
        if(arr !== null){
            for(let item of arr){
                let astr:string = await this.cache.get(item);
                if(astr === null){
                    return;
                }
                let a:Array<number> = JSON.parse(astr);
                if(!a.includes(authId)){
                    return;
                }
                a.splice(a.indexOf(authId),1);
                await this.cache.set({
                    key:item,
                    value:JSON.stringify(a)
                });
            }
        }

        //遍历组权限并清除
        arr = await this.cache.getKeys(this.GROUPKEY + '*');
        if(arr !== null){
            for(let item of arr){
                let astr:string = await this.cache.get(item);
                if(astr === null){
                    return;
                }
                let a:Array<number> = JSON.parse(astr);
                if(!a.includes(authId)){
                    return;
                }
                a.splice(a.indexOf(authId),1);
                await this.cache.set({
                    key:item,
                    value:JSON.stringify(a)
                });
            }
        }
    }

    /**
     * 鉴权
     * @param url       资源url
     * @param session   session对象
     * @return          0 通过 1未登录 2无权限
     */
    static async check(url:string,session:Session):Promise<number>{
        //获取路径
        url = App.url.parse(url).pathname;
        
        let astr:string = await this.cache.get(this.RESKEY + url);
        if(astr === null){
            return 0;
        }
        let resAuthArr:Array<number> = JSON.parse(astr);
        //资源不存在，则直接返回true
        if(!Array.isArray(resAuthArr) || resAuthArr.length === 0){
            return 0;
        }
        // sesion 不存在，返回1
        if(!session){
            return 1;
        }
        let userId:any = await session.get(this.USERID);        
        if(userId === null){
            return 1;
        }
        if(typeof userId === 'string'){
            userId = parseInt(userId);
        }

        let groupIds:Array<number>;
        let gids:string = await this.cache.get(this.USERKEY + userId);
        if(gids !== null){
            groupIds = JSON.parse(gids);
        }
        
        //无组权限，返回无权
        if(!Array.isArray(groupIds) || groupIds.length === 0){
            return 2;
        }

        //用户权限
        let authArr = [];
        for(let id of groupIds){
            //组对应权限
            let a:Array<number>;
            let s:string = await this.cache.get(this.GROUPKEY + id);
            if(!s){
                continue;
            }
            a = JSON.parse(s);
            if(Array.isArray(a) && a.length > 0){
                a.forEach(item=>{
                    if(!authArr.includes(item)){
                        authArr.push(item);        
                    }
                });
            }
        }

        if(authArr.length === 0){
            return 2;
        }
        
        //资源权限包含用户组权限
        for(let au of authArr){
            if(resAuthArr.includes(au)){
                return 0;
            }
        }
        return 2;
    }

    
    /**
     * 获取安全配置页面
     * @param name      配置项名
     * @return          页面url
     */
    static getSecurityPage(name:string){
        return this.securityPages.get(name);
    }

    /**
     * 获取登录前页面
     * @param session   session对象
     * @return          page url
     */
    static async getPreLoginInfo(request:HttpRequest):Promise<string>{
        let session:Session = await request.getSession();
        if(!session){
            return null;
        }
        let info:string = await session.get(this.PRELOGIN);
        await session.del(this.PRELOGIN);
        if(!info){
            return null;
        }
        let json = JSON.parse(info);
        if(!json.page){
            return null;
        }
        let url = App.url.parse(json.page).pathname;
        // 处理参数
        if(json.params){
            let pstr:string = '';
            for(let p in json.params){
                let o:any = json.params[p];
                if(typeof o === 'object'){
                    o = JSON.stringify(o);
                }
                pstr += p + '=' + o + '&';
            }
            if(pstr !== ''){
                pstr = encodeURI(pstr);
                url += '?' + pstr;
            }
        }
        return url;
    }

    /**
     * 设置认证前页面
     * @param session   session对象
     * @param page      page url
     */
    static async setPreLoginInfo(session:Session,request:HttpRequest){
        await session.set(this.PRELOGIN,JSON.stringify({
            page:request.url,
            params:request.parameters
        }));
    }

    
    /**
     * @exclude
     * 文件解析
     * @param path 文件路径 
     */
    static async parseFile(path){
        //读取文件
        let json:any = null;
        try{
            let jsonStr:string = App.fs.readFileSync(path,'utf-8');
            json = App.JSON.parse(jsonStr);
            
        }catch(e){
            throw new NoomiError("2700") + '\n' + e;
        }
        
        await this.init(json);
    }
}

export{SecurityFactory}