/**
 * 全局App对象
 * 把常用模块放置到该全局对象中，可以减少模块初始化时间
 */
export class App {
    /**
     * 应用名，如果存在多个App共享redis，则需要设置改名字，在noomi.json中配置
     */
    static appName:string='APP';
    /**
     * node http 对象
     */
    static http = require('http');
    /**
     * node fs 对象
     */
    static fs = require('fs');
    /**
     * node path 对象
     */
    static path = require('path');
    /**
     * node url 对象
     */
    static url = require('url');
    /**
     * mime 对象
     */
    static mime = require('mime');
    /**
     * uuid 对象
     */
    static uuid = require('uuid');
    /**
     * node util 对象
     */
    static util = require('util');
    /**
     * node querystring 对象
     */
    static qs = require('querystring');
    /**
     * node crypto 对象
     */
    static crypto = require('crypto');
    /**
     * redis 对象
     */
    static redis = require('redis');
    /**
     * json5 对象
     */
    static JSON = require('json5');
    /**
     * 应用配置文件路径
     */
    static configPath:string;
    /**
     * 应用是否部署为集群应用标志
     */
    static isCluster:boolean = false;
}
