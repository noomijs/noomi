import {InstanceFactory} from "./instancefactory";
import {RouteFactory} from "./route/routefactory";
import { AopFactory } from "./aopfactory";
import { FilterFactory } from "../web/filterfactory";
import { HttpRequest } from "../web/httprequest";
import { Server } from "net";

import { IncomingMessage, ServerResponse } from "http";
import { RedisFactory } from "../tools/redisfactory";
import { NoomiError,ErrorFactory } from "../tools/errorfactory";
import { WebConfig } from "../web/webconfig";
import { RequestQueue } from "../web/requestqueue";
import { DBManager } from "../database/dbmanager";
import { NoomiTip_zh } from "../locales/msg_zh";
import { NoomiTip_en } from "../locales/msg_en";
import { Util } from "../tools/util";
import { App } from "../tools/application";
import { SecurityFactory } from "../tools/securityfactory";
import { LaunchHookManager } from "../tools/launchhookmanager";

/**
 * 框架主类
 * @remarks
 * 该类实例化可进行框架初始化，框架初始化有两种方式：
 * 1. new Noomi(config)
 * 2. noomi(config)
 */
class NoomiMain{
    port:number;            //http port
    sslPort:number;         //https port
    server:Server;          // http server
    httpsServer:Server;     //https server
    /**
     * 构造器
     * 初始化一个noomi应用
     * @param port          http端口,默认3000
     * @param configPath    配置文件路径，默认 /config，相对于项目根目录
     * @param sslPort       https端口，默认4000
     */
    constructor(port?:number,configPath?:string,sslPort?:number){
        this.port = port || 3000;
        this.sslPort = sslPort || 4000;
        App.configPath = configPath || '/config';
        this.init();
    }

    /**
     * 初始化框架
     */
    async init(){
        let basePath:string = App.configPath;
        console.log('Server is startup ...');
        let iniJson:object = null;
        try{
            let iniStr = App.fs.readFileSync(Util.getAbsPath([basePath,'noomi.json']),'utf-8');
            iniJson = App.JSON.parse(iniStr);
        }catch(e){
            throw new NoomiError("1001") +'\n' +  e;
        }

        if(iniJson === null){
            throw new NoomiError("1001");
        }
        App.appName = iniJson['app_name']||'APP';
        //设置file watcher开关
        App.openWatcher = iniJson['open_watcher'] || false;
        
        let language:string = iniJson['language'] || 'zh';
        let msgTip:object;
        switch(language){
            case 'zh':
                msgTip = NoomiTip_zh;
                break;
            case 'en':
                msgTip = NoomiTip_en;
                break;
        }
        //异常
        ErrorFactory.init(language);

        //设置是否集群
        App.isCluster = iniJson['cluster']===true?true:false;
        if(App.isCluster && iniJson['redis'] === undefined){
            throw new NoomiError("0600");
        }
        
        //redis初始化
        if(iniJson.hasOwnProperty('redis')){
            console.log(msgTip["0101"]);
            let cfg = iniJson['redis'];
            if(typeof cfg === 'object'){  //配置为对象
                RedisFactory.init(cfg);    
            }else{          //配置为路径
                RedisFactory.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0102"]);
        }
        
        //web config
        if(iniJson.hasOwnProperty('web')){
            console.log(msgTip["0103"]);
            let cfg = iniJson['web'];
            if(typeof cfg === 'object'){  //配置为对象
                WebConfig.init(cfg);    
            }else{          //配置为路径
                WebConfig.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0104"]);
        }

        //数据源初始化
        if(iniJson.hasOwnProperty('database')){
            console.log(msgTip["0111"]);
            let cfg = iniJson['database'];
            if(typeof cfg === 'object'){  //配置为对象
                DBManager.init(cfg);    
            }else{          //配置为路径
                DBManager.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0112"]);
        }
        
        //实例初始化
        if(iniJson.hasOwnProperty('instance')){
            console.log(msgTip["0105"]);
            let cfg = iniJson['instance'];
            if(typeof cfg === 'string'){
                cfg = Util.getAbsPath([basePath,cfg]);
            }
            InstanceFactory.init(cfg);
            console.log(msgTip["0106"]);
        }

        //filter初始化
        if(iniJson.hasOwnProperty('filter')){
            console.log(msgTip["0107"]);
            let cfg = iniJson['filter'];
            if(typeof cfg === 'object'){  //配置为对象
                FilterFactory.init(cfg);    
            }else{          //配置为路径
                FilterFactory.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0108"]);
        }

        //路由初始化
        if(iniJson.hasOwnProperty('route')){
            console.log(msgTip["0109"]);
            let cfg = iniJson['route'];
            if(typeof cfg === 'object'){  //配置为对象
                RouteFactory.init(cfg);    
            }else{          //配置为路径
                RouteFactory.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0110"]);
        }

        //aop初始化
        if(iniJson.hasOwnProperty('aop')){
            console.log(msgTip["0113"]);
            let cfg = iniJson['aop'];
            if(typeof cfg === 'object'){  //配置为对象
                AopFactory.init(cfg);    
            }else{          //配置为路径
                AopFactory.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0114"]);
        }

        //security初始化
        if(iniJson.hasOwnProperty('security')){
            console.log(msgTip["0115"]);
            let cfg = iniJson['security'];
            if(typeof cfg === 'object'){  //配置为对象
                await SecurityFactory.init(cfg);    
            }else{          //配置为路径
                await SecurityFactory.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            console.log(msgTip["0116"]);
        }

        //启动钩子执行
        if(iniJson.hasOwnProperty('launchhook')){
            console.log(msgTip["0119"]);
            let cfg = iniJson['launchhook'];
            if(typeof cfg === 'object'){  //配置为对象
                LaunchHookManager.init(cfg);    
            }else{          //配置为路径
                LaunchHookManager.parseFile(Util.getAbsPath([basePath,cfg]));
            }
            await LaunchHookManager.run();
            console.log(msgTip["0120"]);
        }        

        //如果web config 配置为only https，则不创建http server
        if(!WebConfig.httpsCfg || !WebConfig.httpsCfg['only_https']){
            // http 服务器
            this.server = App.http.createServer((req:IncomingMessage,res:ServerResponse)=>{
                RequestQueue.handleOne(new HttpRequest(req,res));
            }).listen(this.port,(e)=>{
                console.log(`Http Server is running,listening port ${this.port}`);
                //启动队列执行
            }).on('error',(err)=>{
                if (err.code === 'EADDRINUSE') {
                    console.log(msgTip["0118"]);
                    //1秒后重试
                    setTimeout(() => {
                      this.server.close();
                      this.server.listen(this.port);
                    }, 1000);
                }
            }).on('clientError', (err, socket) => {
                socket.end('HTTP/1.1 400 Bad Request\r\n');
            });
        }
        
        //https 服务器
        if(WebConfig.useHttps){
            this.httpsServer = require('https').createServer({
                key: App.fs.readFileSync(WebConfig.httpsCfg['key_file']),
                cert: App.fs.readFileSync(WebConfig.httpsCfg['cert_file'])
            },(req,res)=>{
                RequestQueue.handleOne(new HttpRequest(req,res));
            }).listen(this.sslPort,(e)=>{
                console.log(`Https Server is running,listening port ${this.sslPort}`);
                //启动队列执行
            }).on('error',(err)=>{
                if (err.code === 'EADDRINUSE') {
                    console.log(msgTip["0118"]);
                    //1秒后重试
                    setTimeout(() => {
                      this.httpsServer.close();
                      this.httpsServer.listen(this.sslPort);
                    }, 1000);
                }
            }).on('clientError', (err, socket) => {
                socket.end('HTTP/1.1 400 Bad Request\r\n');
            });
        }
    }
}

/**
 * 框架主函数
 * @param port          http端口,默认3000
 * @param configPath    配置文件路径，默认 /config，相对于项目根目录
 * @param sslPort       https端口，默认4000
 * @returns             NoomiMain对象
 */
function noomi(port?:number,contextPath?:string,sslPort?:number):NoomiMain{
    return new NoomiMain(port,contextPath,sslPort);
}
export {noomi,NoomiMain};
