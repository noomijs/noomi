/**
 * cookie类
 * @remarks
 * 用于response操作cookie
 */

export class HttpCookie{
    /**
     * 参数map
     */
    params:Map<string,string>;
    /**
     * 构造器
     */
    constructor(){
        this.params = new Map();
    }

    /**
     * 设置值
     * @param key   键 
     * @param value 值
     */
    set(key:string,value:string){
        this.params.set(key,value);
    }

    /**
     * 获取值
     * @param key   键 
     */
    get(key:string):string{
        return this.params.get(key);
    }

    /**
     * 获取所有参数
     * @returns     参数map
     */
    getAll():Map<string,string>{
        return this.params;
    }
    /**
     * 删除键
     * @param key   键 
     */
    remove(key:string){
        this.params.delete(key);
    }
}