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
     * @param pa    待处理的字符串数组
     * @returns     字符串数组构成的的绝对地址
     */
    public static getAbsPath(pa:Array<string>):string{
        for(let i=0;i<pa.length;i++){
            if(pa[i].startsWith('/')){
                pa[i] = pa[i].substr(1);
            }
        }
        return App.path.resolve.apply(null,pa);
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
            msg = msg.replace(r[0],param[index]);
        }
        return msg;
    }
    
}