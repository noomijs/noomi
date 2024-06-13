import { BaseRoute } from "../main/route/baseroute";
import { CommonDataType, PropOption, UnknownClass } from "../types/other";
import { TipManager } from "./tipmanager";
import { Util } from "./util";
import { Validator } from "./validator";

/**
 * model管理器
 * @remarks
 * 管理所有DataModel的数据校验、类型转换信息并提供校验和类型转换操作
 */
export class ModelManager{
    /**
     * 模型map
     * @remarks
     * key: model类名
     * 
     * value:配置项
     * ```json
     * {
     *      propName:{
     *          type:'类型',
     *          validator:{validator1:[],...}
     *      },
     *      ...
     * }
     * ```
     */
    private static propMap:Map<string,object> = new Map();
    
    /**
     * null检测属性map
     * @remarks
     * 按遗下方式存储，key:类名.方法名，value:需要nullcheck的字段数组
     * ```json
     * {
     *      className.methodName:[nullCheckField1,nullCheckField2,...]
     * }
     * ```
     */
    private static nullCheckMap: Map<string, string[]> = new Map();

    /**
     * 增加null check
     * @param className -   类名
     * @param methodName -  方法名
     * @param props -       检测数组
     */
    public static setNullCheck(className:string, methodName: string, props: string[]) {
        const name = className + '.' + methodName;
        if (!this.nullCheckMap.has(name)) {
            this.nullCheckMap.set(name, props);
        }
    }

    /**
     * 获取空校验属性数组
     * @param className -   类名
     * @param methodName -  方法名
     * @returns             空校验属性数组
     */
    public static getNullCheck(className:string, methodName: string):string[]{
        return this.nullCheckMap.get(className + '.' + methodName);
    }

    /**
     * 设置属性
     * @param className -   类名
     * @param propName -    属性名
     * @param cfg -         配置项，包含类型和校验器
     */
    public static setProp(className:string,propName:string,cfg:PropOption){
        if(!this.propMap.has(className)){
            const obj = {};
            obj[propName] = cfg;
            this.propMap.set(className,obj);
        }else{
            this.propMap.get(className)[propName] = cfg;
        }
    }

    /**
     * 获取属性配置
     * @param clazz -       类 
     * @param propName -    属性名 
     * @returns             属性配置
     */
    public static getProp(clazz:UnknownClass,propName:string):PropOption{
        //如果找不到，则从父类查找
        while(clazz.name && clazz.name !== '' && clazz.name !== 'Object'){
            if(this.propMap.has(clazz.name)){
                const obj = this.propMap.get(clazz.name);
                if(obj[propName]){
                    return obj[propName];
                }
            }
            //找父类
            clazz = clazz['__proto__'];
        }
    }

    /**
     * 转换和校验，返回数据类型或校验不正确的属性消息集合
     * @param route -       路由对象
     * @param methodName -  方法名
     * @param model -       待处理模型
     * @returns             类型转换或校验结果
     */
    public static handle(route:BaseRoute,methodName:string,model): object {
        const errObj = {};
        //空校验
        const nullArr = this.getNullCheck(route.constructor.name, methodName);
        if(nullArr){
            for (const p of nullArr) {
                const r = Validator.validate('nullable', model[p]);
                if (!r) {
                    errObj[p] = TipManager.getModel('nullable');
                }
            }
        }
        //对所有自有属性进行教养
        for (const p in model) {
            // 空校验异常的属性不处理，方法不处理
            if(errObj[p] || typeof model[p] === 'function'){
                continue;
            }
            const cfg = this.getProp(model.constructor,p);
            //如果不存在配置项，则表示不属于模型，删除
            if(!cfg){
                delete model[p];
                continue;
            }
            //类型转换
            if(cfg.type){
                const typeMsg = this.transform(model,p,cfg.type);
                if (typeMsg) {
                    errObj[p] = typeMsg;
                }
            }
            //校验，如果转换错误，则不再校验
            if(!errObj[p] && cfg.validator){
                const r = this.validate(model,p,cfg.validator);
                if (r !== null) {
                    errObj[p] = r;
                }
            }
        }
        return Object.getOwnPropertyNames(errObj).length === 0 ? null : errObj;
    }

    /**
     * 验证
     * @param model -       模型
     * @param name -        属性名
     * @param validator -   校验器
     * @returns     null或字符串(表示验证异常)
     */
    public static validate(model,name: string,validator):string {
        const value = model[name];
        for (const vn of Object.keys(validator)) {
            if (Validator.hasValidator(vn)) {
                const r = Validator.validate(vn, value, ...validator[vn]);
                if (!r) {
                    return TipManager.getModel(vn, ...validator[vn]);
                }
            } else if (model[vn] && typeof model[vn] === 'function') { // 模型自定义校验器
                const r = model[vn](value, validator[vn]);
                if (r !== null) {
                    return r;
                }
            }
        }
        return null;
    }

    /**
     * 数据格式转换
     * @param model -   模型
     * @param name -    属性名
     * @returns         如果失败，则返回失败信息
     */
    private static transform(model,name: string,type:CommonDataType): string{
        let v = model[name];
        const tp = typeof v;
        // 非字符串，需要去掉两端空格
        if (type !== 'string' && tp === 'string') {
            v = v.trim();
            // 非字符串，且为''，则删除
            if (v === '') {
                delete model[name];
                return;
            }
        }
        // 类型不为string则不转换
        if (tp === 'string') {
            switch (type) {
                case 'int':         // 整数
                    if (/(^[\+\-]?0$)|(^[\+\-]?[1-9]\d*$)/.test(v)) {
                        v = parseInt(v);
                    } else {
                        return TipManager.getModel(type);
                    }
                    break;
                case 'float':       // 小数
                    if (/^[\+\-]?\d+(\.?\d+)?$/.test(v)) {
                        v = parseFloat(v);
                    } else {
                        return TipManager.getModel(type);
                    }
                    break;
                case 'number': //数字
                    if (/^[\+\-]?\d+(\.?\d+)?$/.test(v)) {
                        v = Number(v);
                    } else {
                        return TipManager.getModel(type);
                    }
                    break;
                case 'boolean':     // bool
                    if (v === 'true') {
                        v = true;
                    } else if (v === 'false') {
                        v = false;
                    } else {
                        return TipManager.getModel(type);
                    }
                    break;
                case 'array':       // 数组类型
                    try {
                        v = Util.eval(v);
                        if (!Array.isArray(v)) {
                            return TipManager.getModel(type);
                        }
                    } catch (e) {
                        return TipManager.getModel(type);
                    }
                    break;
                case 'object':      // object类型
                    try {
                        v = Util.eval(v);
                        if (typeof v !== 'object') {
                            return TipManager.getModel(type);
                        }
                    } catch (e) {
                        return TipManager.getModel(type);
                    }
                    break;
                default: // 字符串不处理
            }
        }
        model[name] = v;
    }
}