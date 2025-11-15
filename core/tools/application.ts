/**
 * 全局App对象
 * @remarks
 * 对常用模块统一管理，减少模块初始化时间
 * 
 * @public
 */
export class App {
    /**
     * 应用名，如果存在多个App共享redis，则需要设置改名字，在noomi.json中配置
     */
    public static appName: string = 'APP';

    /**
     * 语言
     */
    public static language: string = 'zh';
    /**
     * 是否打开file watcher
     */
    public static openWatcher: boolean = false;
    /**
     * node http 对象
     */
    public static http = require('http');
    /**
     * node fs 对象
     */
    public static fs = require('fs');
    /**
     * node path 对象
     */
    public static path = require('path');
    /**
     * node url 对象
     */
    public static url = require('url');
    /**
     * mime 对象
     */
    public static mime = require('mime');
    /**
     * uuid 对象
     */
    public static uuid = require('uuid');
    /**
     * node util 对象
     */
    public static util = require('util');
    /**
     * node querystring 对象
     */
    public static qs = require('querystring');
    /**
     * node crypto 对象
     */
    public static crypto = require('crypto');
    /**
     * redis 对象
     */
    public static redis = require('redis');
    /**
     * stream 对象
     */
    public static stream = require('stream');
    /**
     * zlib 对象
     */
    public static zlib = require('zlib');
    
    /**
     * os 对象
     */
    public static os = require('os');
    /**
     * 应用配置文件路径
     */
    public static configPath: string;
    /**
     * 应用是否部署为集群应用标志
     */
    public static isCluster: boolean = false;
}
