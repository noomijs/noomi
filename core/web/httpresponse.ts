import {ServerResponse, IncomingMessage} from "http";
import {HttpCookie} from "./httpcookie";
import {WebConfig} from "./webconfig";
import {App} from "../tools/application";
import {Stats} from "fs";
import {ERouteResultType} from "../types/routetypes";
import { ResponseWriteOption } from "../types/webtypes";

/**
 * http响应
 * @remarks
 * 在ServerResponse基础上增加了写客户端方法，更适合直接使用
 */
export class HttpResponse extends ServerResponse {
    /**
     * 源response
     */
    srcRes: ServerResponse;
    /**
     * 源request
     */
    request: IncomingMessage;
    /**
     * cookie
     */
    cookie: HttpCookie = new HttpCookie();

    /**
     * 初始化response对象
     * @param req -   源request对象
     * @param res -   源response对象
     */
    init(req: IncomingMessage, res: ServerResponse) {
        this.request = req;
        this.srcRes = res;
    }

    /**
     * 写到浏览器(客户)端
     * @param config -    回写配置项
     */
    writeToClient(config: ResponseWriteOption): void {
        this.writeCookie();
        this.setCorsHead();
        let data: string | Buffer | object = config.data || '';
        const charset = config.charset || 'utf8';
        if (!(data instanceof Buffer)) {
            if (typeof data === 'object') {
                data = JSON.stringify(data);
            } else if (typeof data !== 'string') {
                data = data + "";
            }
        }
        const status = config.statusCode || 200;
        const type = config.type || 'text/html';
        // contenttype 和 字符集
        this.setHeader('Content-Type', type + ';charset=' + charset);
        if (config.size) {
            this.setHeader('Content-Length', config.size);
        }
        // 压缩
        if (config.zip) {
            this.setHeader('Content-Encoding', config.zip);
            this.setHeader('Vary', 'Accept-Encoding');
        }
        // 处理method = head
        if (this.doHead()) {
            return;
        }
        this.srcRes.writeHead(status, {}).end(data, <BufferEncoding>charset);
    }

    /**
     * 写数据流到浏览器(客户端)
     * @param config -    回写配置项
     * @param mimeType -  mime 类型
     */
    writeFileToClient(config: ResponseWriteOption): void {
        this.writeCookie();
        this.setCorsHead();
        // 文件路径
        const path = config.data;
        // mime类型
        if (!config.type) {
            config.type = App.mime.getType(path);
        }
        if (!config.size) {
            const stat: Stats = App.fs.statSync(path);
            config.size = stat.size;
        }
        this.setContentType(config.type);
        this.setContentLength(config.size);
        // 处理method=head
        if (this.doHead()) {
            return;
        }
        const req: IncomingMessage = this.request;
        const res = this.srcRes;
        const range = req.headers.range;
        // 带range的请求
        if (range) {
            const arr = range.split('=');
            const byteName = arr[0];
            const positions = arr[1].split("-");
            const start = parseInt(positions[0], 10);
            const stats = App.fs.statSync(path);
            const total = stats.size;
            const end = positions[1] ? parseInt(positions[1], 10) : total - 1;
            const size = (end - start) + 1;
            this.setContentLength(size);
            res.writeHead(206, {
                "Content-Range": byteName + ' ' + start + '-' + (start + size - 1) + "/" + total,
                "Accept-Ranges": byteName
            });
            const stream = App.fs.createReadStream(path, {start: start, end: end})
                .on("open", function () {
                    stream.pipe(res);
                }).on("error", function (err) {
                    res.end(err);
                });
        } else {
            res.writeHead(200, {});
            App.fs.createReadStream(path, {option: 'r'}).pipe(res);
        }
    }

    /**
     * 设置回传header
     * @param key -     键
     * @param value -   值
     * @returns         HttpResponse实例
     */
    setHeader(name: string, value: number | string | string[]) {
        this.srcRes.setHeader(name, value);
        return this;
    }

    /**
     * 获取header值
     * @param key -     键
     * @returns         header值
     */
    getHeader(key: string): number | string | string[] {
        return this.srcRes.getHeader(key);
    }

    /**
     * 重定向
     * @param page -    跳转路径url
     * @returns         redirect
     */
    redirect(page: string) {
        this.writeCookie();
        this.srcRes.writeHead(
            302,
            {
                'Location': page,
                'Content-Type': 'text/html'
            }
        );
        this.srcRes.end();
        return ERouteResultType.REDIRECT;
    }

    /**
     * 写cookie到header
     */
    writeCookie() {
        const kvs = this.cookie.getAll();
        let str = '';
        for (const kv of kvs) {
            str += kv[0] + '=' + kv[1] + ';';
        }
        if (str !== '') {
            str += 'Path=/; Secure; HttpOnly; SameSite=None';
            this.srcRes.setHeader('Set-Cookie', str);
        }
        return str;
    }

    /**
     * 设置跨域头
     */
    setCorsHead() {
        if (!this.request.headers['origin'] || !WebConfig.cors || !WebConfig.cors['domain']) {
            return;
        }
        // 来源域
        const domain: string = WebConfig.cors['domain'].trim();
        if (domain === '') {
            return;
        }
        this.setHeader('Access-Control-Allow-Origin', domain);
        this.setHeader('Access-Control-Allow-Headers', WebConfig.cors['allow_headers'] || '');
        this.setHeader('Access-Control-Allow-Method', "POST,GET,HEAD,OPTIONS");
        if (domain !== '*') {
            this.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        this.setHeader('Access-Control-Max-Age', WebConfig.cors['access_max_age'] || 86400);
    }

    /**
     * 设置回写类型
     * @param type -      类型
     */
    setContentType(type: string) {
        this.setHeader('Content-Type', type);
    }

    /**
     * 设置content length
     * @param length -    内容长度
     */
    setContentLength(length: number) {
        this.setHeader('Content-Length', length);
    }

    /**
     * 处理head方法请求
     * @returns         如果请方法为head，则返回true，否则返回false
     */
    doHead(): boolean {
        if (this.request.method === 'HEAD') {
            this.srcRes.writeHead(200, {});
            this.srcRes.write('');
            this.srcRes.end();
            return true;
        }
        return false;
    }

    /**
     * 处理trace方法请求
     */
    doTrace() {
        this.setContentType("message/http");
        this.setContentLength(0);
    }

    /**
     * 处理options请求方法
     */
    doOptions() {
        this.setHeader('Allow', 'GET, POST, OPTIONS, HEAD');
        this.writeCookie();
        this.setCorsHead();
        this.setContentLength(0);
        this.srcRes.writeHead(200, {});
        this.srcRes.end();
    }
}