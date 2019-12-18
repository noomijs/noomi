import { App } from "./application";

export class Util{
    /**
     * 字符串转regexp
     * @param str       待处理字符串
     * @param side      两端匹配 1前端 2后端 3两端
     */
    static toReg(str:string,side?:number):RegExp{
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
     * @return      字符串数组构成的的绝对地址
     */
    static getAbsPath(pa:Array<string>):string{
        for(let i=0;i<pa.length;i++){
            if(pa[i].startsWith('/')){
                pa[i] = pa[i].substr(1);
            }
        }
        return App.path.resolve.apply(null,pa);
    }
}