import { Code } from "typeorm";

/**
 * 页面工厂
 */
class PageFactory{
    static errorPages:Map<number,string> = new Map();      //错误页面集合

    /**
     * 添加错误提示页
     * @param code      错误码
     * @param url       页面地址
     */
    static addErrorPage(code:number,url:string){
        this.errorPages.set(code,url);
    }   

    /**
     * 获取错误提示页
     * @param code      错误码
     */
    static getErrorPage(code:number){
        return this.errorPages.get(code);
    }
}

export {PageFactory};