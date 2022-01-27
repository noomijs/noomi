import { Validator } from "./validator";
import { NoomiModelTip } from "../locales/noomimodeltip";
import { App } from './application';
import { Util } from "./util";

/**
 * 模型配置接口
 */
interface IModelCfg{
    /**
     * 数据类型
     */
    type:string;

    /**
     * 校验器 {name:参数数组}
     */
    validators:object;
}

/**
 * 基础模型
 */
class BaseModel{
    /**
     * 校验器map
     * key:propName,value:校验器数组
     */
    private static __validatorMap:Map<string,any> = new Map();

    /**
     * 数据类型map
     * key:propName,value:数据类型
     */
    private static __typeMap:Map<string,string> = new Map();
    
    /**
     * 空校验数组
     */
    private __nullCheckArr:string[];

    /**
     * 构造器
     * @param nullArr   对应路由方法的空校验字段map
     */
    constructor(nullArr?:string[]){
        this.__nullCheckArr = nullArr;
    }

    /**
     * 转换和校验，返回数据类型或校验不正确的属性消息集合
     */
    public __handle():object{
        let errObj = {};
        //空校验
        let r;
        if(this.__nullCheckArr){
            for(let p of this.__nullCheckArr){
                r = Validator.validate('nullable',this[p],null);
                if(!r){
                    errObj[p] = Util.compileString(NoomiModelTip[App.language]['nullable'],[]);
                }
            }
        }
        for(let p of Object.keys(this)){
            //空校验异常或__开头的属性不处理
            if(errObj[p] || p.startsWith('__')){
                continue;
            }
            //类型转换
            if(!this.__transform(p)){
                errObj[p] =  NoomiModelTip[App.language][this.constructor['__typeMap'].get(p)];
            }else{
                let r = this.__validate(p);
                if(r !== null){
                    errObj[p] = r;
                }
            }
        }
        return Object.getOwnPropertyNames(errObj).length === 0?null:errObj;
    }
    /**
     * 验证
     * @param name  属性名
     * @returns     null或字符串(表示验证异常)
     */
    public __validate(name:string){
        const validators = this.constructor['__validatorMap'].get(name);
        if(!validators){
            return null;
        }
        let value = this[name];
        for(let vn of Object.keys(validators)){
            if(Validator.hasValidator(vn)){
                let r = Validator.validate(vn,value,validators[vn]);
                if(!r){
                    return Util.compileString(NoomiModelTip[App.language][vn],validators[vn]);
                }
            }else if(this[vn] && typeof this[vn] === 'function'){ //模型自定义校验器
                let r = this[vn](value,validators[vn]);
                if(r !== null){
                    return r;
                }
            }
        }
        return null;
    }

    /**
     * 数据格式转换
     * @param name  属性名
     * @returns     true 转换成功 false转换失败
     */
    private __transform(name:string):boolean{
        const type = this.constructor['__typeMap'].get(name);
        if(!type){
            return true;
        }
        let v = this[name];
        const tp = typeof v;
        //非字符串，需要去掉两端空格
        if(type !== 'string' && tp === 'string'){
            v = v.trim();
            //非字符串，且为''，则删除
            if(v === ''){
                delete this[name];
                return true;
            }
        }
        
        //类型不为string则不转换
        if(tp === 'string'){
            switch(type){
                case 'int':         //整数
                    if(/(^0$)|(^[1-9]\d*$)/.test(v)){
                        v = parseInt(v);
                    }else{
                        return false;
                    }
                    break;
                case 'float':       //小数
                    if(/^\d+(\.?\d+)?$/.test(v)){
                        v = parseFloat(v);
                    }else{
                        return false;
                    }
                    break;
                case 'boolean':     //bool
                    if(v === 'true'){
                        v = true;
                    }else if(v === 'false'){
                        v = false;
                    }else{
                        return false;
                    }
                    break;
                case 'array':       //数组类型
                    try{
                        v = Util.eval(v);
                        if(!Array.isArray(v)){
                            return false;
                        }
                    }catch(e){
                        return false;
                    }
                    break;
                case 'object':      //object类型
                    try{
                        v = Util.eval('(' + v + ')');
                        if(typeof v !== 'object'){
                            return false;
                        }
                    }catch(e){
                        return false;
                    }
                    break;
                default: //字符串，不处理
            }
        }
        this[name] = v;
        return true;
    }

    /**
     * 设置校验器
     * @param name          属性名
     * @param validators    验证器
     */
    public static __setValidator(name:string,validators:object){
        if(!this.__validatorMap.has(name)){
            this.__validatorMap.set(name,validators);
        }
    }

    
    /**
     * 设置数据类型
     * @param name      属性名
     * @param type      属性类型
     */
    public static __setType(name:string,type:string){
        if(!this.__typeMap.has(name)){
            this.__typeMap.set(name,type);
        }
    }
}

export{BaseModel}