import {App} from "./application";

/**
 * 工具类
 * @remarks
 * 提供工具方法
 */
export class Util {
    /**
     * 字符串转regexp
     * @param str -       待处理字符串
     * @param side -      两端匹配 1前端 2后端 3两端
     * @returns         转换后的正则表达式
     */
    public static toReg(str: string, side?: number): RegExp {
        // 转字符串为正则表达式并加入到数组
        //替换/为\/
        str = str.replace(/\//g, '\\/');
        //替换.为\.
        str = str.replace(/\./g, '\\.');
        //替换*为.*
        str = str.replace(/\*/g, '.*');
        if (side !== undefined) {
            switch (side) {
                case 1:
                    str = '^' + str;
                    break;
                case 2:
                    str = str + '$';
                    break;
                case 3:
                    str = '^' + str + '$';
            }
        }
        return new RegExp(str);
    }

    /**
     * 获取绝对路径
     * @param pa -            待处理的字符串数组
     * @returns             字符串数组构成的的绝对地址
     */
    public static getAbsPath(pa: Array<string>): string {
        for (let i = 0; i < pa.length; i++) {
            if (pa[i].startsWith('/')) {
                pa[i] = pa[i].substring(1);
            }
        }
        return App.path.resolve(...pa);
    }

    /**
     * 获取相对于根目录的url path
     * @param pa -    地址数组
     * @returns     url path
     */
    public static getUrlPath(pa: Array<string>): string {
        let path = pa.join('/');
        path = path.replace(/\\/g, '/');
        path = path.replace(/\/{2,}/g, '/');
        //首字母不为"/"，则添加
        if (path[0] !== '/') {
            path = '/' + path;
        }
        return path;
    }

    /**
     * 获取相对路径
     * @param path -    待处理的字符串数组
     * @returns     字符串数组构成的的绝对地址
     */
    public static getRelPath(path: string): string {
        const bp: string = App.path.resolve();
        if (path.startsWith(bp)) {
            return path.substring(bp.length);
        }
        return path;
    }

    /**
     * 编译消息，把`${n}`内容替换为参数
     * @param msg -     待编译消息
     * @param params -  参数数组
     * @returns         编译后的字符串
     */
    public static compileString(src: string, ...params): string {
        if(!params || params.length === 0){
            return src;
        }
        let reg: RegExp;
        for (let i=0;i<params.length;i++) {
            const ri = '${' + i + '}';
            if (src.indexOf(ri) !== -1) {
                reg = new RegExp('\\$\\{' + i + '\\}', 'g');
                src = src.replace(reg, params[i]);
            } else {
                break;
            }
        }
        return src;
    }

    /**
     * 克隆object
     * @param srcObj -  源对象
     * @returns         克隆后的对象
     */
    static clone(srcObj: object): object {
        const map: WeakMap<object, object> = new WeakMap();
        return clone(srcObj);

        /**
         * clone对象
         * @param src -   待clone对象
         * @returns     克隆后的对象
         */
        function clone(src) {
            // 非对象或函数，直接返回
            if (!src || typeof src !== 'object' || typeof src === 'function') {
                return src;
            }
            let dst;
            if (src.constructor === Object) {
                dst = new Object();
                // 把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                map.set(src, dst);
                Object.getOwnPropertyNames(src).forEach((prop) => {
                    dst[prop] = getCloneObj(src[prop]);
                });
            } else if (src.constructor === Map) {
                dst = new Map();
                // 把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                src.forEach((value, key) => {
                    dst.set(key, getCloneObj(value));
                });
            } else if (Array.isArray(src)) {
                dst = [];
                // 把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                src.forEach(function (item, i) {
                    dst[i] = getCloneObj(item);
                });
            }
            return dst;
        }

        /**
         * 获取clone对象
         * @param value -     待clone值
         */
        function getCloneObj(value) {
            if (typeof value === 'object' && typeof value !== 'function') {
                let co = null;
                if (!map.has(value)) {  // clone新对象
                    co = Util.clone(value);
                } else {                // 从map中获取对象
                    co = map.get(value);
                }
                return co;
            }
            return value;
        }
    }

    /**
     * eval 操作
     * @param evalStr - eval串
     * @returns         eval值
     */
    public static eval(evalStr: string): unknown {
        return new Function(`return(${evalStr})`)();
    }

    /**
     * 获取模块
     * @remarks
     * 针对export输出的对象
     * @param path -    模块路径
     * @returns 
     */
    
    public static async getModuleClass(path:string): Promise<unknown> {
        const mdl = await import(path);
        const keys = Object.keys(mdl);
        if(keys&&keys.length>0){
            return mdl[keys[0]];
        }
    }
}