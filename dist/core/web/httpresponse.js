"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const httpcookie_1 = require("./httpcookie");
const application_1 = require("../tools/application");
class HttpResponse extends http_1.ServerResponse {
    constructor() {
        super(...arguments);
        this.cookie = new httpcookie_1.HttpCookie(); //cookie
    }
    init(req, res) {
        this.request = req;
        this.srcRes = res;
    }
    /**
     * 回写到浏览器端
     * @param data          待写数据
     * @param charset       字符集
     * @param type          数据类型
     * @param crossDomain   跨域
     */
    writeToClient(config) {
        let data = config.data || '';
        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }
        let charset = config.charset || 'utf8';
        let status = config.statusCode || 200;
        let type = config.type || 'text/html';
        //设置cookie
        this.writeCookie();
        let headers = {};
        //跨域
        if (config.crossDomain) {
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Access-Control-Allow-Headers'] = 'Content-Type';
        }
        //contenttype 和 字符集
        headers['Content-Type'] = type + ';charset=' + charset;
        //数据长度
        headers['Content-Length'] = Buffer.byteLength(data);
        this.srcRes.writeHead(status, headers);
        this.srcRes.write(data, charset);
        this.srcRes.end();
    }
    /**
     * 写header
     * @param key
     * @param value
     */
    setHeader(key, value) {
        this.srcRes.setHeader(key, value);
    }
    /**
     * 回写文件到浏览器端
     * @param file          待写文件
     * @param charset       字符集
     * @param type          数据类型
     * @param crossDomain   跨域
     */
    async writeFileToClient(config) {
        let charset = config.charset || 'utf8';
        let status = config.statusCode || 200;
        //设置cookie
        this.writeCookie();
        let type = application_1.App.mime.getType(config.path);
        let errCode;
        let data = await new Promise((resolve, reject) => {
            application_1.App.fs.readFile(config.path, 'utf8', (err, file) => {
                if (err) {
                    errCode = 404;
                    resolve();
                }
                else {
                    resolve(file);
                }
            });
        });
        //有异常码，退出
        if (errCode !== undefined) {
            return errCode;
        }
        let headers = {};
        //数据长度
        headers['Content-Length'] = Buffer.byteLength(data);
        //contenttype 和 字符集
        headers['Content-Type'] = type + ';charset=' + charset;
        this.srcRes.writeHead(status, headers);
        this.srcRes.write(data, charset);
        this.srcRes.end();
    }
    /**
     * 重定向
     * @param response
     * @param page          跳转路径
     */
    redirect(page) {
        this.writeCookie();
        this.srcRes.writeHead(302, {
            'Location': page,
            'Content-Type': 'text/html'
        });
        this.srcRes.end();
    }
    /**
     * 写cookie到头部
     */
    writeCookie() {
        let kvs = this.cookie.getAll();
        let str = '';
        for (let kv of kvs) {
            str += kv[0] + '=' + kv[1] + ';';
        }
        if (str !== '') {
            str += 'Path=/';
            this.srcRes.setHeader('Set-Cookie', str);
        }
        return str;
    }
}
exports.HttpResponse = HttpResponse;
//# sourceMappingURL=httpresponse.js.map