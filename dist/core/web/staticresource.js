"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pagefactory_1 = require("../tools/pagefactory");
const webcache_1 = require("./webcache");
const webconfig_1 = require("./webconfig");
const util_1 = require("../tools/util");
const application_1 = require("../tools/application");
/**
 * 静态资源加载器
 */
class StaticResource {
    /**
     *
     * @param path      文件路径
     * @param request   request
     * @param response  response
     */
    static async load(request, response, path) {
        //config 为默认路径
        if (this.forbiddenMap.size === 0) {
            this.addPath('/config');
        }
        let finded = false;
        //检测是否在forbidden map中
        for (let p of this.forbiddenMap) {
            if (p[1].test(path)) {
                finded = true;
                break;
            }
        }
        let errCode;
        let data;
        //禁止访问路径，直接返回404
        if (finded) {
            errCode = 404;
        }
        else {
            let filePath = application_1.App.path.posix.join(process.cwd(), path);
            if (webconfig_1.WebConfig.useServerCache) { //从缓存取，如果用浏览器缓存数据，则返回0，不再操作
                data = await webcache_1.WebCache.load(request, response, path);
                if (data === 0) {
                    //回写没修改标志
                    response.writeToClient({
                        statusCode: 304
                    });
                }
            }
            if (data === undefined) { //读取文件
                if (!application_1.App.fs.existsSync(filePath) || !application_1.App.fs.statSync(filePath).isFile()) {
                    errCode = 404;
                }
                else {
                    data = await new Promise((resolve, reject) => {
                        application_1.App.fs.readFile(filePath, 'utf8', (err, v) => {
                            if (err) {
                                resolve();
                            }
                            resolve(v);
                        });
                    });
                    //存到cache
                    if (data && webconfig_1.WebConfig.useServerCache) {
                        await webcache_1.WebCache.add(path, filePath, data, response);
                    }
                }
            }
        }
        if (data) {
            //写到浏览器
            await response.writeToClient({
                data: data
            });
        }
        else if (errCode !== undefined) {
            let page = pagefactory_1.PageFactory.getErrorPage(errCode);
            if (page) {
                response.redirect(page);
            }
            else {
                response.writeToClient({
                    statusCode: errCode
                });
            }
        }
    }
    /**
     * 添加静态路径
     * @param paths   待添加的目录或目录数组
     */
    static addPath(paths) {
        if (!Array.isArray(paths)) {
            if (typeof paths === 'string') {
                if (application_1.App.fs.existsSync(application_1.App.path.posix.join(process.cwd(), paths))) {
                    this.forbiddenMap.set(paths, util_1.Util.toReg(paths, 1));
                }
            }
        }
        else {
            paths.forEach(item => {
                if (typeof item === 'string') {
                    this.addPath(item);
                }
            });
        }
    }
}
exports.StaticResource = StaticResource;
StaticResource.forbiddenMap = new Map(); //forbidden path map
//# sourceMappingURL=staticresource.js.map