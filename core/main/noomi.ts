import {InstanceFactory} from "./instancefactory";
import {RouteFactory} from "./route/routefactory";
import { AopFactory } from "./aopfactory";
import { FilterFactory } from "../web/filterfactory";
import { HttpRequest } from "../web/httprequest";
import { Server } from "net";
import { SecurityFactory } from "../tools/securityfactory";
import { IncomingMessage, ServerResponse } from "http";
import { RedisFactory } from "../tools/redisfactory";
import { NoomiError,ErrorFactory } from "../tools/errorfactory";
import { WebConfig } from "../web/webconfig";
import { RequestQueue } from "../web/requestqueue";
import { DBManager } from "../database/dbmanager";
import { App } from "../tools/application";
import { NoomiTip_zh } from "../locales/msg_zh";
import { NoomiTip_en } from "../locales/msg_en";

class Noomi{
    port:number=3000;
    server:Server;
    constructor(port?:number,configPath?:string){
        this.port = port || 3000;
        configPath = configPath || '/config';
        App.configPath = configPath;
        this.init(configPath);
    }

    /**
     * 初始化
     */
    async init(basePath:string){
        console.log('Server is startup ...');
        let iniJson:object = null;
        try{
            let iniStr = App.fs.readFileSync(App.path.posix.join(process.cwd(),basePath,'noomi.json'),'utf-8');
            iniJson = App.JSON.parse(iniStr);
        }catch(e){
            throw new NoomiError("1001") +'\n' +  e;
        }

        if(iniJson === null){
            throw new NoomiError("1001");
        }
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

        //redis初始化
        if(iniJson.hasOwnProperty('redis')){
            console.log(msgTip["0101"]);
            let cfg = iniJson['redis'];
            if(typeof cfg === 'object'){  //配置为对象
                RedisFactory.init(cfg);    
            }else{          //配置为路径
                RedisFactory.parseFile(App.path.posix.join(basePath,cfg));
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
                WebConfig.parseFile(App.path.posix.join(basePath,cfg));
            }
            console.log(msgTip["0104"]);
        }

        //实例初始化
        if(iniJson.hasOwnProperty('instance')){
            console.log(msgTip["0105"]);
            let cfg = iniJson['instance'];
            if(typeof cfg === 'string'){
                cfg = App.path.posix.join(basePath,cfg);
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
                FilterFactory.parseFile(App.path.posix.join(basePath,cfg));
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
                RouteFactory.parseFile(App.path.posix.join(basePath,cfg));
            }
            console.log(msgTip["0110"]);
        }

        //数据源初始化
        if(iniJson.hasOwnProperty('database')){
            console.log(msgTip["0111"]);
            let cfg = iniJson['database'];

            if(typeof cfg === 'object'){  //配置为对象
                DBManager.init(cfg);    
            }else{          //配置为路径
                DBManager.parseFile(App.path.posix.join(basePath,cfg));
            }
            
            console.log(msgTip["0112"]);
        }
        
        //aop初始化
        if(iniJson.hasOwnProperty('aop')){
            console.log(msgTip["0113"]);
            let cfg = iniJson['aop'];
            if(typeof cfg === 'object'){  //配置为对象
                AopFactory.init(cfg);    
            }else{          //配置为路径
                AopFactory.parseFile(App.path.posix.join(basePath,cfg));
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
                await SecurityFactory.parseFile(App.path.posix.join(basePath,cfg));
            }
            console.log(msgTip["0116"]);
        }

        //超过cpu最大使用效率时处理
        // process.on('SIGXCPU',()=>{
        //     //请求队列置false
        //     // RequestQueue.setCanHandle(false);
        // });
        
        //创建server
        this.server = App.http.createServer((req:IncomingMessage,res:ServerResponse)=>{
            RequestQueue.handleOne(new HttpRequest(req,res));
        }).listen(this.port,(e)=>{
            console.log(`Server is running,listening port ${this.port}`);
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
}

function noomi(port?:number,contextPath?:string){
    return new Noomi(port,contextPath);
}
export {noomi,Noomi};
