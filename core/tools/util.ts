import { App } from "./application";

/**
 * 工具类
 * @remarks
 * 提供工具方法
 */
export class Util{
    /**
     * 字符串转regexp
     * @param str       待处理字符串
     * @param side      两端匹配 1前端 2后端 3两端
     * @returns         转换后的正则表达式
     */
    public static toReg(str:string,side?:number):RegExp{
        // 转字符串为正则表达式并加入到数组
        //替换/为\/
        str = str.replace(/\//g,'\\/');
        //替换.为\.
        str = str.replace(/\./g,'\\.');
        //替换*为.*
        str = str.replace(/\*/g,'.*');
        if(side !== undefined){
            switch(side){
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
     * @param pa            待处理的字符串数组
     * @param relative      是否所有元素为相对路径，如果设置为false，且数组元素首字母为'/'，则会去掉，默认false
     * @returns             字符串数组构成的的绝对地址
     */
    public static getAbsPath(pa:Array<string>):string{
        for(let i=0;i<pa.length;i++){
            if(pa[i].startsWith('/')){
                pa[i] = pa[i].substr(1);
            }
        }
        return App.path.resolve(...pa);
    }

    /**
     * 获取相对于根目录的url path
     * @param pa    地址数组
     * @returns     url path
     */
    public static getUrlPath(pa:Array<string>):string{
        let path = pa.join('/');
        path = path.replace(/\\/g,'/');
        path = path.replace(/\/{2,}/g,'/');
        //首字母不为"/"，则添加
        if(path[0] !== '/'){
            path = '/' + path;
        }
        return path;
    }

    /**
     * 获取相对路径
     * @param pa    待处理的字符串数组
     * @returns     字符串数组构成的的绝对地址
     */
    public static getRelPath(path:string):string{
        let bp:string = App.path.resolve();
        if(path.startsWith(bp)){
            return path.substr(bp.length);
        }
        return path;
    }

    /**
     * 编译消息，把${}内容替换为参数
     * @param msg       待编译消息
     * @param param     参数数组
     * @returns         编译后的字符串
     * @since 0.4.8
     */
    public static compileString(msg:string,param:Array<any>):string{
        let reg = /\$\{\d+?\}/;
        let r;
        //处理消息中的参数
        while((r=reg.exec(msg)) !== null){
            let index = r[0].substring(2,r[0].length-1).trim();
            if(index && index !== ''){
                index = parseInt(index);
            }
            msg = msg.replace(r[0],typeof param[index] === 'object'?JSON.stringify(param[index]):param[index]);
        }
        return msg;
    }

    /**
     * 克隆object
     * @param srcObj    源对象
     * @returns         克隆后的对象
     */
    static clone(srcObj:object):any{
        let map:WeakMap<object,any> = new WeakMap();
        return clone(srcObj);

        /**
         * clone对象
         * @param src   待clone对象
         * @returns     克隆后的对象
         */
        function clone(src){
            //非对象或函数，直接返回            
            if(!src || typeof src !== 'object' || typeof src === 'function'){
                return src;
            }
            
            let dst;
            
            if(src.constructor === Object){
                dst = new Object();
                //把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                map.set(src,dst);
                Object.getOwnPropertyNames(src).forEach((prop)=>{
                    dst[prop] = getCloneObj(src[prop]);
                });
            } else if(src.constructor === Map){
                dst = new Map();
                //把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                src.forEach((value,key)=>{
                    dst.set(key,getCloneObj(value));
                });
            }else if(Array.isArray(src)){
                dst = new Array();
                //把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                src.forEach(function(item,i){
                    dst[i] = getCloneObj(item);
                });
            }
            return dst;
        }

        /**
         * 获取clone对象
         * @param value     待clone值
         */
        function getCloneObj(value){
            if(typeof value === 'object' && typeof value !== 'function'){
                let co = null;
                if(!map.has(value)){  //clone新对象
                    co = Util.clone(value);
                }else{                //从map中获取对象
                    co = map.get(value);
                }
                return co;
            }
            return value;
        }
    }

    /**
     * eval
     * @param evalStr   eval串
     * @returns         eval值
     */
     public static eval(evalStr: string): any {
        return new Function(`return(${evalStr})`)();
    }
    
}