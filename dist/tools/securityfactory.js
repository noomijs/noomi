"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const instancefactory_1 = require("../main/instancefactory");
const securityfilter_1 = require("../web/filter/securityfilter");
const errorfactory_1 = require("./errorfactory");
const ncache_1 = require("./ncache");
const sessionfactory_1 = require("../web/sessionfactory");
const dbmanager_1 = require("../database/dbmanager");
const application_1 = require("./application");
const filterfactory_1 = require("../web/filterfactory");
class SecurityFactory {
    /**
     * 初始化配置
     * @config      配置项
     */
    static async init(config) {
        //鉴权失败页面
        if (config.hasOwnProperty('auth_fail_url')) {
            this.securityPages.set('auth_fail_url', config['auth_fail_url']);
        }
        //登录页面
        if (config.hasOwnProperty('login_url')) {
            this.securityPages.set('login_url', config['login_url']);
        }
        if (config.hasOwnProperty('auth_type')) {
            this.authType = config['auth_type'];
        }
        if (config.hasOwnProperty('save_type')) {
            this.saveType = config['save_type'];
        }
        if (config.hasOwnProperty('redis')) {
            this.redis = config['redis'];
        }
        if (config.hasOwnProperty('max_size')) {
            this.maxSize = config['max_size'];
        }
        //数据库解析
        if (config.hasOwnProperty('dboption')) {
            this.dbOptions = config.dboption;
        }
        //初始化security filter
        instancefactory_1.InstanceFactory.addInstance({
            name: 'NoomiSecurityFilter',
            instance: new securityfilter_1.SecurityFilter(),
            class: securityfilter_1.SecurityFilter
        });
        filterfactory_1.FilterFactory.addFilter({
            instance_name: 'NoomiSecurityFilter',
            url_pattern: config['expressions'],
            order: 1
        });
        //创建cache
        this.cache = new ncache_1.NCache({
            name: 'NSECURITY',
            saveType: this.saveType,
            maxSize: this.maxSize,
            redis: this.redis
        });
        //初始化表名和字段名
        let tResource;
        let tGroupAuth;
        let tResourceAuth;
        let authId;
        let groupId;
        let resourceId;
        let resourceUrl;
        if (this.dbOptions) {
            if (this.dbOptions.tables) {
                tResource = this.dbOptions.tables['resource'];
                tGroupAuth = this.dbOptions.tables['groupAuthority'];
                tResourceAuth = this.dbOptions.tables['resourceAuthority'];
            }
            if (this.dbOptions.columns) {
                authId = this.dbOptions.columns['authorityId'];
                groupId = this.dbOptions.columns['groupId'];
                resourceId = this.dbOptions.columns['resourceId'];
                resourceUrl = this.dbOptions.columns['resourceUrl'];
            }
        }
        let ids = {
            tGroupAuth: tGroupAuth || "t_group_authority",
            tResource: tResource || "t_resource",
            tResourceAuth: tResourceAuth || "t_resource_authority",
            authId: authId || "authority_id",
            groupId: groupId || "group_id",
            resourceId: resourceId || "resource_id",
            resourceUrl: resourceUrl || "url"
        };
        let results;
        let product = this.dbOptions.product || dbmanager_1.DBManager.product;
        let connCfg = this.dbOptions ? this.dbOptions.conn_cfg : null;
        //从表中加载数据
        switch (product) {
            case "mysql":
                results = await handleMysql(connCfg, ids);
                break;
            case "mssql":
                results = await handleMssql(connCfg, ids);
                break;
            case "oracle":
                results = await handleOracle(connCfg, ids);
                break;
        }
        //组权限
        let gaMap = new Map(); //{groupdId1:[authId1,authId2,..],...}
        for (let r of results[0]) {
            let aids;
            if (gaMap.has(r.gid)) {
                aids = gaMap.get(r.gid);
            }
            else {
                aids = [];
            }
            aids.push(r.aid);
            gaMap.set(r.gid, aids);
        }
        //更新组权限
        for (let p of gaMap) {
            await this.updGroupAuths(p[0], p[1]);
        }
        let resArr = [];
        //资源
        for (let r of results[1]) {
            let a = [];
            for (let r1 of results[2]) {
                if (r1.rid === r.rid) {
                    let aid = r1.aid;
                    if (a.includes(aid)) {
                        continue;
                    }
                    a.push(aid);
                }
            }
            await this.updResourceAuths(r.url, a);
        }
        /**
         * 处理mysql
         * @param cfg
         */
        async function handleMysql(cfg, ids) {
            let conn;
            let arr = [];
            let cm = null;
            try {
                if (!cfg) { //cfg为空，直接使用dbmanager的connection manager
                    cm = dbmanager_1.DBManager.getConnectionManager();
                    if (!cm) {
                        throw new errorfactory_1.NoomiError("2800");
                    }
                    conn = await cm.getConnection();
                }
                else {
                    conn = require('mysql').createConnection(cfg);
                    await conn.connect();
                }
                //组权限
                let results = await new Promise((resolve, reject) => {
                    conn.query("select " + ids.groupId + "," + ids.authId + " from " + ids.tGroupAuth, (error, results, fields) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(results);
                    });
                });
                let a = [];
                for (let r of results) {
                    a.push({
                        gid: r[ids.groupId],
                        aid: r[ids.authId]
                    });
                }
                arr.push(a);
                //资源
                results = await new Promise((resolve, reject) => {
                    conn.query("select " + ids.resourceId + "," + ids.resourceUrl + " from " + ids.tResource, (error, results, fields) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(results);
                    });
                });
                let a1 = [];
                for (let r of results) {
                    a1.push({
                        rid: r[ids.resourceId],
                        url: r[ids.resourceUrl]
                    });
                }
                arr.push(a1);
                //资源权限
                results = await new Promise((resolve, reject) => {
                    conn.query("select " + ids.resourceId + "," + ids.authId + " from " + ids.tResourceAuth, (error, results, fields) => {
                        if (error) {
                            reject(error);
                        }
                        resolve(results);
                    });
                });
                let a2 = [];
                for (let r of results) {
                    a2.push({
                        rid: r[ids.resourceId],
                        aid: r[ids.authId]
                    });
                }
                arr.push(a2);
            }
            catch (e) {
                throw e;
            }
            finally {
                //关闭连接
                if (conn) {
                    if (cm !== null) {
                        await cm.release(conn);
                    }
                    else {
                        try {
                            conn.end();
                        }
                        catch (err) {
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
        async function handleMssql(cfg, ids) {
            let conn;
            let arr = [];
            let cm = null;
            if (!cfg) {
                cm = dbmanager_1.DBManager.getConnectionManager();
                if (!cm) {
                    throw new errorfactory_1.NoomiError("2800");
                }
                conn = await cm.getConnection();
            }
            else {
                conn = await require('mssql').getConnection(cfg);
            }
            try {
                //组权限
                let result = await conn.query("select " + ids.groupId + "," + ids.authId + " from " + ids.tgroupauth);
                let a = [];
                for (let r of result.recordset) {
                    a.push({
                        gid: r[ids.groupId],
                        aid: r[ids.authId]
                    });
                }
                arr.push(a);
                //资源
                result = await conn.query("select " + ids.resourceId + "," + ids.resourceUrl + " from " + ids.tresource);
                let a1 = [];
                for (let r of result.recordset) {
                    a1.push({
                        rid: r[ids.resourceId],
                        url: r[ids.resourceUrl]
                    });
                }
                arr.push(a1);
                //资源权限
                result = await conn.query("select " + ids.resourceId + "," + ids.authId + " from " + ids.tresourceauth);
                let a2 = [];
                for (let r of result.recordset) {
                    a2.push({
                        rid: r[ids.resourceId],
                        aid: r[ids.authId]
                    });
                }
                arr.push(a2);
            }
            catch (e) {
                throw e;
            }
            finally {
                //关闭连接
                if (conn) {
                    if (cm !== null) {
                        await cm.release(conn);
                    }
                    else {
                        try {
                            conn.close();
                        }
                        catch (err) {
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
        async function handleOracle(cfg, ids) {
            let conn;
            let arr = [];
            let cm = null;
            if (!cfg) {
                cm = dbmanager_1.DBManager.getConnectionManager();
                if (!cm) {
                    throw new errorfactory_1.NoomiError("2800");
                }
                conn = await cm.getConnection();
            }
            else {
                conn = await require('oracledb').getConnection(cfg);
            }
            try {
                //组权限
                let result = await conn.execute("select " + ids.groupId + "," + ids.authId + " from " + ids.tgroupauth);
                let a = [];
                for (let r of result.rows) {
                    a.push({
                        gid: r[0],
                        aid: r[1]
                    });
                }
                arr.push(a);
                //资源
                result = await conn.execute("select " + ids.resourceId + "," + ids.resourceUrl + " from " + ids.tresource);
                let a1 = [];
                for (let r of result.rows) {
                    a1.push({
                        rid: r[0],
                        url: r[1]
                    });
                }
                arr.push(a1);
                //资源权限
                result = await conn.execute("select " + ids.resourceId + "," + ids.authId + " from " + ids.tresourceauth);
                let a2 = [];
                for (let r of result.rows) {
                    a2.push({
                        rid: r[0],
                        aid: r[1]
                    });
                }
                arr.push(a2);
            }
            catch (e) {
                throw e;
            }
            finally {
                //关闭连接
                if (conn) {
                    if (cm !== null) {
                        await cm.release(conn);
                    }
                    else {
                        try {
                            await conn.close();
                        }
                        catch (err) {
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
    static async addUserGroup(userId, groupId) {
        let key = this.USERKEY + userId;
        let s = await this.cache.get(key);
        let arr;
        if (s !== null) {
            arr = JSON.parse(s);
        }
        else {
            arr = [];
        }
        if (arr.includes(groupId)) {
            return;
        }
        arr.push(groupId);
        await this.cache.set({
            key: key,
            value: JSON.stringify(arr)
        });
    }
    /**
     * 添加用户组(多个组)
     * @param userId    用户id
     * @param groups    组id 数组
     */
    static async addUserGroups(userId, groups, request) {
        //保存userId 到session object
        if (request) {
            let session = await sessionfactory_1.SessionFactory.getSession(request);
            if (session) {
                await session.set(this.USERID, userId);
            }
        }
        //保存用户组
        await this.cache.set({
            key: this.USERKEY + userId,
            value: JSON.stringify(groups)
        });
    }
    /**
     * 添加组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static async addGroupAuthority(groupId, authId) {
        let key = this.GROUPKEY + groupId;
        let s = await this.cache.get(key);
        let arr;
        if (s !== null) {
            arr = JSON.parse(s);
        }
        else {
            arr = [];
        }
        if (arr.includes(authId)) {
            return;
        }
        arr.push(authId);
        await this.cache.set({
            key: key,
            value: JSON.stringify(arr)
        });
    }
    /**
     * 添加组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static async updGroupAuths(groupId, authIds) {
        let key = this.GROUPKEY + groupId;
        await this.cache.del(key);
        await this.cache.set({
            key: key,
            value: JSON.stringify(authIds)
        });
    }
    /**
     * 添加资源权限
     * @param resourceId    资源id
     * @param authId        资源id
     */
    static async addResourceAuth(url, authId) {
        let key = this.RESKEY + url;
        let s = await this.cache.get(key);
        let arr;
        if (s !== null) {
            arr = JSON.parse(s);
        }
        else {
            arr = [];
        }
        if (arr.includes(authId)) {
            return;
        }
        arr.push(authId);
        await this.cache.set({
            key: key,
            value: JSON.stringify(arr)
        });
    }
    /**
     * 添加资源权限(多个权限)
     * @param url       资源id
     * @param auths     权限id数组
     */
    static async updResourceAuths(url, auths) {
        let key = this.RESKEY + url;
        await this.cache.del(key);
        let s = await this.cache.set({
            key: key,
            value: JSON.stringify(auths)
        });
    }
    /**
     * 删除用户     用户id
     * @param userId
     */
    static async deleteUser(userId, request) {
        //保存userId 到session object
        if (request) {
            let session = await sessionfactory_1.SessionFactory.getSession(request);
            if (session) {
                await sessionfactory_1.SessionFactory.delSession(session.id);
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
    static async deleteUserGroup(userId, groupId) {
        let key = this.USERKEY + userId;
        let astr = await this.cache.get(key);
        if (astr === null) {
            return;
        }
        let a = JSON.parse(astr);
        if (!a.includes(groupId)) {
            return;
        }
        a.splice(a.indexOf(groupId), 1);
        await this.cache.set({
            key: key,
            value: JSON.stringify(a)
        });
    }
    /**
     * 删除组
     * @param groupId   组id
     */
    static async deleteGroup(groupId) {
        await this.cache.del(this.GROUPKEY + groupId);
    }
    /**
     * 删除组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static async deleteGroupAuthority(groupId, authId) {
        let key = this.GROUPKEY + groupId;
        let astr = await this.cache.get(key);
        if (astr === null) {
            return;
        }
        let a = JSON.parse(astr);
        if (!a.includes(authId)) {
            return;
        }
        a.splice(a.indexOf(authId), 1);
        await this.cache.set({
            key: key,
            value: JSON.stringify(a)
        });
    }
    /**
     * 删除资源
     * @param resourceId   资源id
     */
    static async deleteResource(url) {
        await this.cache.del(this.RESKEY + url);
    }
    /**
     * 删除资源权限
     * @param resourceId     资源id
     * @param authId    权限id
     */
    static async deleteResourceAuthority(url, authId) {
        let key = this.RESKEY + url;
        let astr = await this.cache.get(key);
        if (astr === null) {
            return;
        }
        let a = JSON.parse(astr);
        if (!a.includes(authId)) {
            return;
        }
        a.splice(a.indexOf(authId), 1);
        await this.cache.set({
            key: key,
            value: JSON.stringify(a)
        });
    }
    /**
     * 删除权限
     * @param authId    权限Id
     */
    static async deleteAuthority(authId) {
        //遍历资源权限并清除
        let arr = await this.cache.getKeys(this.RESKEY + '*');
        if (arr !== null) {
            for (let item of arr) {
                let astr = await this.cache.get(item);
                if (astr === null) {
                    return;
                }
                let a = JSON.parse(astr);
                if (!a.includes(authId)) {
                    return;
                }
                a.splice(a.indexOf(authId), 1);
                await this.cache.set({
                    key: item,
                    value: JSON.stringify(a)
                });
            }
        }
        //遍历组权限并清除
        arr = await this.cache.getKeys(this.GROUPKEY + '*');
        if (arr !== null) {
            for (let item of arr) {
                let astr = await this.cache.get(item);
                if (astr === null) {
                    return;
                }
                let a = JSON.parse(astr);
                if (!a.includes(authId)) {
                    return;
                }
                a.splice(a.indexOf(authId), 1);
                await this.cache.set({
                    key: item,
                    value: JSON.stringify(a)
                });
            }
        }
    }
    /**
     * 鉴权
     * @param url       资源
     * @param session   session
     * @return          0 通过 1未登录 2无权限
     */
    static async check(url, session) {
        //获取路径
        url = application_1.App.url.parse(url).pathname;
        let astr = await this.cache.get(this.RESKEY + url);
        if (astr === null) {
            return 0;
        }
        let resAuthArr = JSON.parse(astr);
        //资源不存在，则直接返回true
        if (!Array.isArray(resAuthArr) || resAuthArr.length === 0) {
            return 0;
        }
        // sesion 不存在，返回1
        if (!session) {
            return 1;
        }
        let userId = await session.get(this.USERID);
        if (userId === null) {
            return 1;
        }
        if (typeof userId === 'string') {
            userId = parseInt(userId);
        }
        let groupIds;
        let gids = await this.cache.get(this.USERKEY + userId);
        if (gids !== null) {
            groupIds = JSON.parse(gids);
        }
        //无组权限，返回无权
        if (!Array.isArray(groupIds) || groupIds.length === 0) {
            return 2;
        }
        //用户权限
        let authArr = [];
        for (let id of groupIds) {
            //组对应权限
            let a;
            let s = await this.cache.get(this.GROUPKEY + id);
            if (!s) {
                continue;
            }
            a = JSON.parse(s);
            if (Array.isArray(a) && a.length > 0) {
                a.forEach(item => {
                    if (!authArr.includes(item)) {
                        authArr.push(item);
                    }
                });
            }
        }
        if (authArr.length === 0) {
            return 2;
        }
        //资源权限包含用户组权限
        for (let au of authArr) {
            if (resAuthArr.includes(au)) {
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
    static getSecurityPage(name) {
        return this.securityPages.get(name);
    }
    /**
     * 获取登录前页面
     * @param session   session
     * @return          page url
     */
    static async getPreLoginInfo(request) {
        let session = await request.getSession();
        if (!session) {
            return null;
        }
        let info = await session.get(this.PRELOGIN);
        await session.del(this.PRELOGIN);
        if (!info) {
            return null;
        }
        let json = JSON.parse(info);
        if (!json.page) {
            return null;
        }
        let url = application_1.App.url.parse(json.page).pathname;
        // 处理参数
        if (json.params) {
            let pstr = '';
            for (let p in json.params) {
                let o = json.params[p];
                if (typeof o === 'object') {
                    o = JSON.stringify(o);
                }
                pstr += p + '=' + o + '&';
            }
            if (pstr !== '') {
                pstr = encodeURI(pstr);
                url += '?' + pstr;
            }
        }
        return url;
    }
    /**
     * 设置认证前页面
     * @param session   Session
     * @param page      pageurl
     */
    static async setPreLoginInfo(session, request) {
        await session.set(this.PRELOGIN, JSON.stringify({
            page: request.url,
            params: request.parameters
        }));
    }
    /**
     * 文件解析
     * @param path
     */
    static async parseFile(path) {
        //读取文件
        let json = null;
        try {
            let jsonStr = application_1.App.fs.readFileSync(application_1.App.path.posix.join(process.cwd(), path), 'utf-8');
            json = application_1.App.JSON.parse(jsonStr);
        }
        catch (e) {
            throw new errorfactory_1.NoomiError("2700") + '\n' + e;
        }
        await this.init(json);
    }
}
exports.SecurityFactory = SecurityFactory;
SecurityFactory.sessionName = 'NOOMI_SECURITY_OBJECT';
SecurityFactory.authType = 0; //认证类型 0 session 1 token
SecurityFactory.saveType = 0; //数据存储类型，0内存 1redis    默认0
SecurityFactory.redis = 'default'; //redis名，在redis.json中已定义
SecurityFactory.securityPages = new Map();
//资源列表
SecurityFactory.resources = new Map();
//用户
SecurityFactory.users = new Map();
//组
SecurityFactory.groups = new Map();
SecurityFactory.USERKEY = 'USER';
SecurityFactory.GROUPKEY = 'GROUP';
SecurityFactory.RESKEY = 'RESOURCE';
SecurityFactory.USERID = 'NSECURITY_USERID'; //userid在session中的名字
SecurityFactory.PRELOGIN = 'NSECURITY_PRELOGIN'; //prelogin在session中的名字
SecurityFactory.redisUserKey = "NOOMI_SECURITY_USERS"; //users在redis的key
SecurityFactory.redisGroupKey = "NOOMI_SECURITY_GROUPS"; //groups在redis的key
SecurityFactory.redisResourceKey = "NOOMI_SECURITY_RESOURCES"; //resource在redis的key
//# sourceMappingURL=securityfactory.js.map