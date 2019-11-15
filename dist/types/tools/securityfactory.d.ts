import { HttpRequest } from "../web/httprequest";
import { NCache } from "./ncache";
import { Session } from "../web/sessionfactory";
/**
 * 安全工厂
 */
interface ResourceObj {
    url: string;
    auths: Array<number>;
}
declare class SecurityFactory {
    static sessionName: string;
    static dbOptions: any;
    static authType: number;
    static saveType: number;
    static redis: string;
    static maxSize: number;
    static cache: NCache;
    static securityPages: Map<string, string>;
    static resources: Map<number, ResourceObj>;
    static users: Map<number, Array<number>>;
    static groups: Map<number, Array<number>>;
    static USERKEY: string;
    static GROUPKEY: string;
    static RESKEY: string;
    static USERID: string;
    static PRELOGIN: string;
    static redisUserKey: string;
    static redisGroupKey: string;
    static redisResourceKey: string;
    /**
     * 初始化配置
     * @config      配置项
     */
    static init(config: any): Promise<void>;
    /**
     * 添加用户组
     * @param userId    用户id
     * @param groupId   组id
     */
    static addUserGroup(userId: number, groupId: number): Promise<void>;
    /**
     * 添加用户组(多个组)
     * @param userId    用户id
     * @param groups    组id 数组
     */
    static addUserGroups(userId: number, groups: Array<number>, request?: HttpRequest): Promise<void>;
    /**
     * 添加组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static addGroupAuthority(groupId: number, authId: number): Promise<void>;
    /**
     * 添加组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static updGroupAuths(groupId: number, authIds: Array<number>): Promise<void>;
    /**
     * 添加资源权限
     * @param resourceId    资源id
     * @param authId        资源id
     */
    static addResourceAuth(url: string, authId: number): Promise<void>;
    /**
     * 添加资源权限(多个权限)
     * @param url       资源id
     * @param auths     权限id数组
     */
    static updResourceAuths(url: string, auths: Array<number>): Promise<void>;
    /**
     * 删除用户     用户id
     * @param userId
     */
    static deleteUser(userId: number, request?: HttpRequest): Promise<void>;
    /**
     * 删除用户组
     * @param userId    用户id
     * @param groupId   组id
     */
    static deleteUserGroup(userId: number, groupId: number): Promise<void>;
    /**
     * 删除组
     * @param groupId   组id
     */
    static deleteGroup(groupId: number): Promise<void>;
    /**
     * 删除组权限
     * @param groupId   组id
     * @param authId    权限id
     */
    static deleteGroupAuthority(groupId: number, authId: number): Promise<void>;
    /**
     * 删除资源
     * @param resourceId   资源id
     */
    static deleteResource(url: string): Promise<void>;
    /**
     * 删除资源权限
     * @param resourceId     资源id
     * @param authId    权限id
     */
    static deleteResourceAuthority(url: string, authId: number): Promise<void>;
    /**
     * 删除权限
     * @param authId    权限Id
     */
    static deleteAuthority(authId: number): Promise<void>;
    /**
     * 鉴权
     * @param url       资源
     * @param session   session
     * @return          0 通过 1未登录 2无权限
     */
    static check(url: string, session: Session): Promise<number>;
    /**
     * 获取安全配置页面
     * @param name      配置项名
     * @return          页面url
     */
    static getSecurityPage(name: string): string;
    /**
     * 获取登录前页面
     * @param session   session
     * @return          page url
     */
    static getPreLoginInfo(request: HttpRequest): Promise<string>;
    /**
     * 设置认证前页面
     * @param session   Session
     * @param page      pageurl
     */
    static setPreLoginInfo(session: Session, request: HttpRequest): Promise<void>;
    /**
     * 文件解析
     * @param path
     */
    static parseFile(path: any): Promise<void>;
}
export { SecurityFactory };
