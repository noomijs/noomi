/**
 * 模型验证器
 */
class Validator{
    /**
     * 验证器集合
     */
    private static valiators:Map<string,Function> = new Map();

    /**
     * 是否拥有该名字的验证器
     * @param validatorName 
     */
    public static hasValidator(validatorName:string){
        return this.valiators.has(validatorName);
    }

    /**
     * 添加验证器
     * @param name  验证器名 
     * @param foo   验证器方法
     */
    public static addValidator(name:string,foo:Function){
        if(typeof foo !== 'function'){
            return;
        }
        this.valiators.set(name,foo);
    }

    /**
     * 添加验证器集
     * @param config {validatorName:foo,...} 
     */
    public static addValidators(config:object){
        Object.getOwnPropertyNames(config).forEach((item)=>{
            if(typeof config[item] !== 'function'){
                return;
            }
            this.addValidator(item,config[item]);
        });
    }

    /**
     * 验证
     * @param name      验证名
     * @param value     验证内容
     * @param paramArr  附加参数，根据调用确定
     * @returns         通过/不通过
     */
    public static validate(name:string,value:any,paramArr:any[]):boolean{
        if(!this.valiators.has(name)){
            return true;
        }
        let foo = this.valiators.get(name);
        let arr = [];
        //处理参数值
        arr.push(value);
        if(Array.isArray(paramArr)){
            arr = arr.concat(paramArr);
        }else if(paramArr !== null){
            arr.push(paramArr);
        }
        return foo.apply(null,arr);
    }
}

/**
 * 初始化验证器
 */
Validator.addValidators({
    "nullable":function(value){
        return value !== undefined && value !== null && value !== "";
    },
    "min":function(value,min){
        return value>=min;
    },
    "max":function(value,max){
        return value<=max;
    },
    "between":function(value,min,max){
        return value>=min && value<=max;
    },
    "minLength":function(value,min){
        return typeof value === 'string' && value.length>=min;
    },
    "maxLength":function(value,max){
        return typeof value === 'string' && value.length<=max;
    },
    "betweenLength":function(value,min,max){
        return typeof value === 'string' && value.length>=min && value.length<=max;
    },
    "date":function(value){
        return /^\d{4}[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])$/.test(value);
    },
    "datetime":function(value){
        return /^\d{4}[-\/](0[1-9]|1[0-2])[-\/](0[1-9]|[12]\d|3[01])\s+([0-1]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/.test(value);
    },
    "time":function(value){
        return /([0-1]?[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/.test(value);
    },
    "email":function(value){
        return /^\w+\S*@[\w\d]+(\.\w+)+$/.test(value);
    },
    "url":function(value){
        return /^(https?|ftp):\/\/[\w\d]+\..*/.test(value);
    },
    "mobile":function(value){
        return /^1[3-9]\d{9}$/.test(value);
    },
    "idno":function(value){
        return /^[1-9]\d{7}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}$|^[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}([0-9]|X)$/.test(value);
    },
    /**
     * 判断值是否匹配数组某个元素
     * @param value     值
     * @param arr       带匹配数组
     */
    "in":function(value,arr){
        if(!arr || !Array.isArray(arr)){
            return false;
        }
        return arr.includes(value);
    }
});

export{Validator}

