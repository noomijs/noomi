export class App {
    static appName:string='APP';          //应用名
    static http = require('http');
    static fs = require('fs');
    static path = require('path');
    static url = require('url');
    static mime = require('mime');
    static uuid = require('uuid');
    static util = require('util');
    static qs = require('querystring');
    static crypto = require('crypto');
    static redis = require('redis');
    static JSON = require('json5');
    static configPath:string;
    static isCluster:boolean = false;       //应用是否部署为为集群
}
