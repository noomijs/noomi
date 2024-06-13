import {InstanceFactory} from "./instancefactory";
import {HttpRequest} from "../web/httprequest";
import {Server} from "net";
import {IncomingMessage, ServerResponse} from "http";
import {RedisFactory} from "../tools/redisfactory";
import {NoomiError} from "../tools/noomierror";
import {WebConfig} from "../web/webconfig";
import {RequestQueue} from "../web/requestqueue";
import {DBManager} from "../database/dbmanager";
import {Util} from "../tools/util";
import {App} from "../tools/application";
import {LaunchHookManager} from "../tools/launchhookmanager";
import { TipManager } from "../tools/tipmanager";

/**
 * 框架主类
 * @remarks
 * 该类实例化可进行框架初始化，框架初始化有两种方式：
 * 
 * 1. new NoomiMain(config)
 * 
 * 2. noomi(config)
 */
export class NoomiMain {
    /**
     * http端口
     */
    private port: number;
    /**
     * https 端口
     */
    private sslPort: number;

    /**
     * http server
     */
    private server: Server;

    /**
     * https server
     */
    private httpsServer: Server;

    /**
     * 构造器
     * 初始化一个noomi应用
     * @param port -          http端口,默认3000
     * @param configPath -    配置文件路径，默认 /config，相对于项目根目录
     * @param sslPort -       https端口，默认4000
     */
    constructor(port?: number, configPath?: string, sslPort?: number) {
        this.port = port || 3000;
        this.sslPort = sslPort || 4000;
        App.configPath = configPath || '/config';
        this.init().catch(r => {
            console.error(r);
        });
    }

    /**
     * 初始化框架
     */
    async init() {
        const basePath: string = App.configPath;
        let iniJson: object = null;
        // 开始启动
        console.log('read file "noomi.json".');
        try {
            const iniStr = App.fs.readFileSync(Util.getAbsPath([basePath, 'noomi.json']), 'utf-8');
            iniJson = <object>Util.eval(iniStr);
        } catch (e) {
            throw new NoomiError("1001") + '\n' + e;
        }
        if (iniJson === null) {
            throw new NoomiError("1001");
        }
        App.appName = iniJson['app_name'] || 'APP';
        App.language = iniJson['language'] || 'zh';

        // 开始启动
        console.log(TipManager.getTip("0100"));
        // 设置是否集群
        App.isCluster = iniJson['cluster'] === true;
        if (App.isCluster && iniJson['redis'] === undefined) {
            throw new NoomiError("0600");
        }
        // redis初始化
        if (iniJson.hasOwnProperty('redis')) {
            console.log(TipManager.getTip("0101"));
            const cfg = iniJson['redis'];
            if (typeof cfg === 'object') {  // 配置为对象
                RedisFactory.init(cfg);
            } else {          // 配置为路径
                RedisFactory.parseFile(Util.getAbsPath([basePath, cfg]));
            }
            console.log(TipManager.getTip("0102"));
        }
        // web config
        if (iniJson.hasOwnProperty('web')) {
            console.log(TipManager.getTip("0103"));
            const cfg = iniJson['web'];
            if (typeof cfg === 'object') {  // 配置为对象
                WebConfig.init(cfg);
            } else {          // 配置为路径
                WebConfig.parseFile(Util.getAbsPath([basePath, cfg]));
            }
            console.log(TipManager.getTip("0104"));
        }
        // 数据源初始化
        if (iniJson.hasOwnProperty('database')) {
            console.log(TipManager.getTip("0111"));
            const cfg = iniJson['database'];
            if (typeof cfg === 'object') {  // 配置为对象
                DBManager.init(cfg);
            } else {          // 配置为路径
                DBManager.parseFile(Util.getAbsPath([basePath, cfg]));
            }
            console.log(TipManager.getTip("0112"));
        }
        // 实例初始化
        if (iniJson.hasOwnProperty('instance')) {
            console.log(TipManager.getTip("0105"));
            await InstanceFactory.init(iniJson['instance']).catch(r => {
                console.error(r);
            })
            console.log(TipManager.getTip("0106"));
        }
        // 启动钩子执行
        await LaunchHookManager.run().catch(r => {
            console.error(r);
        });
        // 如果web config 配置为only https，则不创建http server
        if (!WebConfig.httpsCfg || !WebConfig.httpsCfg['only_https']) {
            // http 服务器
            this.server = App.http.createServer((req: IncomingMessage, res: ServerResponse) => {
                RequestQueue.handle(new HttpRequest(req, res));
            }).listen(this.port, () => {
                // Noomi启动成功！
                console.log(TipManager.getTip("0117"));
                // Http服务器正在运行,监听端口 ${0}
                console.log(TipManager.getTip("0121", this.port));
                // 启动队列执行
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    // 地址正被使用，重试中...
                    console.log(TipManager.getTip("0118"));
                    // 1秒后重试
                    setTimeout(() => {
                        this.server.close();
                        this.server.listen(this.port);
                    }, 1000);
                }
            }).on('clientError', (err, socket) => {
                socket.end('HTTP/1.1 400 Bad Request\r\n');
            });
        }
        // https 服务器
        if (WebConfig.useHttps) {
            this.httpsServer = require('https').createServer({
                key: App.fs.readFileSync(WebConfig.httpsCfg['key_file']),
                cert: App.fs.readFileSync(WebConfig.httpsCfg['cert_file'])
            }, (req, res) => {
                RequestQueue.handle(new HttpRequest(req, res));
            }).listen(this.sslPort, () => {
                console.log(TipManager.getTip("0122", this.sslPort));
                // 启动队列执行
            }).on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(TipManager.getTip("0118"));
                    // 1秒后重试
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
 * @param port -          http端口,默认3000
 * @param contextPath -   配置文件路径，默认 /config，相对于项目根目录
 * @param sslPort -       https端口，默认4000
 * @returns             NoomiMain对象
 */
export function noomi(port?: number, contextPath?: string, sslPort?: number): NoomiMain {
    return new NoomiMain(port, contextPath, sslPort);
}
