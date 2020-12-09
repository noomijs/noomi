import { Validator } from "./validator";
import { NoomiModelTip } from "../locales/noomimodeltip";
import { App } from './application';
import { Util } from "./util";
/**
 * 模型驱动 模型接口
 */
interface IModel{
    __props:Map<string,IModelCfg>;
}

/**
 * 
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
    private __props:Map<string,IModelCfg>;

    /**
     * 转换和验证，返回数据类型或验证不正确的属性消息集合
     */
    public __handle():object{
        if(!this.__props){
            return null;
        }
        
        let errObj = {};
        for(let o of this.__props){
            let prop = o[0];
            let po:IModelCfg = o[1];
            if(!this.__transform(prop)){ //数据格式转换
                errObj[prop] =  NoomiModelTip[App.language][po.type];
            }else{ //校验
                let r = this.__validate(prop);
                if(r!==null){
                    errObj[prop] = r;
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
    private __validate(name:string){
        if(!this.__props){
            return null;
        }
        let cfg:IModelCfg = this.__props.get(name);
        if(!cfg || !cfg.validators){
            return null;
        }
        let value = this[name];
        //值为空且有nullable
        if((value ===undefined || value === null) && !cfg.validators['nullable']){
            return null;
        }
        for(let vn of Object.getOwnPropertyNames(cfg.validators)){
            if(Validator.hasValidator(vn)){
                let r = Validator.validate(vn,value,cfg.validators[vn]);
                if(!r){
                    return Util.compileString(NoomiModelTip[App.language][vn],cfg.validators[vn]);
                }
            }else if(this[vn] && typeof this[vn] === 'function'){ //模型自定义校验器
                let r = this[vn](value);
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
        if(!this.__props){
            return true;
        }
        let cfg:IModelCfg = this.__props.get(name);
        
        let v = this[name];
        if(!cfg || !cfg.type || v === undefined || v === null){
            return true;
        }
        switch(cfg.type){
            case 'int':         //整数
                if(/^[1-9]\d*$/.test(v)){
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
                    v = eval(v);
                    if(!Array.isArray(v)){
                        return false;
                    }
                }catch(e){
                    return false;
                }
                break;
            default: //字符串，不处理
        }
        this[name] = v;
        return true;
    }

    /**
     * 设置校验器
     * @param name          属性名
     * @param validators    验证器
     */
    public __setValidator(name:string,validators:object){
        if(!this.__props){
            this.__props = new Map();
        }
        let cfg:IModelCfg = this.__props.get(name);
        if(!cfg){
            cfg = {
                type:'string',
                validators:validators
            }
            this.__props.set(name,cfg);
        }else{
            cfg.validators = validators;
        }
    }

    /**
     * 给属性增加指定校验器
     * @param name 
     * @param validatorName 
     * @param params 
     */
    public __addValidator(name:string,validatorName:string,params?:[]){
        if(!this.__props){
            this.__props = new Map();
        }
        let cfg:IModelCfg = this.__props.get(name);
        if(!cfg){
            cfg = {
                type:'string',
                validators:{}
            }
            this.__props.set(name,cfg);
        }else if(!cfg.validators){
            cfg.validators = {};
        }
        //增加校验器
        cfg.validators[validatorName] = params || [];
    }   

    /**
     * 设置数据类型
     * @param name      属性名
     * @param type      属性类型
     */
    public __setType(name:string,type:string){
        if(!this.__props){
            this.__props = new Map();
        }
        let cfg:IModelCfg = this.__props.get(name);
        if(!cfg){
            cfg = {
                type:type,
                validators:null
            }
            this.__props.set(name,cfg);
        }else{
            cfg.type=type;
        }
    }

}

export{IModel,BaseModel}