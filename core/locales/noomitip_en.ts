/**
 * noomi英文提示信息
 */
export const NoomiTip_en = {
    tip:{
        "0100":"Noomi is booting ...",
        "0101":"redis initing ...",
        "0102":"redis inition finished",
        "0103":"web initing ...",
        "0104":"web inition finished",
        "0105":"instance factory initing ...",
        "0106":"instance factory inition finished!",
        "0107":"filter initing...",
        "0108":"filter inition finished",
        "0109":"route factory initing ...",
        "0110":"route factory inition finished",
        "0111":"datasource initing ...",
        "0112":"datasource inition finished",
        "0113":"aop initing ...",
        "0114":"aop inition finished",
        "0115":"security initing ...",
        "0116":"security inition finished",
        "0117":"Noomi is started!",
        "0118":"address is in used，trying again ...",
        "0119":"check and execute launch hooks ...",
        "0120":"launch hooks execution finished!",
        "0121":'Http Server is running,listening port ${0}',
        "0122":'Https Server is running,listening port ${0}'
    },
    //异常消息
    error: {
        "0000": "unknown error",
        "0001": "Error in configuration process,noomi.ini may be invalid",
        "0050": "file does not exist",
        "0100": "Error in exception configuration file,Please read the official documentation!",
        "0500": "Error in web configuration file,Please read the official documentation!",
        "0501": "upload file is oversize",
        "0502": "form submit without boundary",
        "0600": "Lack of redis config!",

        "1000": "Error in instance configuration file,Please read the official documentation!",
        "1001": "Instance '${0}' does not exist",
        "1002": "Instance '${0}' already exists，it cannot be defined repatedly",
        "1003": "Module must be defined as class",
        "1004": "Module path '${0}' does not exist",
        "1010": "Instance method '${0}' does not exist",
        "1011": "instance decorator params are wrong",

        "2000": "Error in aop configuration file,Please read the official documentation!",
        "2001": "Error in expressions parameter configuration of pointcut",
        "2002": "pointcut '${0}' does not exist",
        "2003": "pointcut '${0}' already exists，it cannot be defined repatedly",
        "2005": "advice '${0}' already exists",

        "2100": "Error in route configuration file,Please read the official documentation!",
        "2101": "Error in route results configuration",
        "2102": "Error in access route",
        "2103": "Route '${0}' does not exist",

        "2200": "Error in filter configuration file,Please read the official documentation!",

        "2500": "Error in orm configuration file,Please read the official documentation!",

        "2600": "Error in redis configuration file,Please read the official documentation!",
        "2601": "redis client '${0}' does not exist",

        "2700": "Error in security configuration file,Please read the official documentation!",

        "2800": "Error in data source configuration file,Please read the official documentation!",

        "3002": "Attempt to allocate Buffer larger than maximum size",
        "3010": "key already exists，it cannot be defined as object",
        "3011": "need value",

        "4001":"database package is required",
        "4002": "database package '${0}' does not exist"
    },
    //模型消息
    model: {
        //类型消息
        "int": "Need input integer",
        "float": "Need input float",
        "number": "Need input number",
        "string": "Need input string",
        "boolean": "Need input boolean",
        "array": "Need input array",
        //校验消息
        "nullable": "Not allow empty",
        "min": "Value must >= ${0}",
        "max": "Value must <= ${0}",
        "between": "Value must between ${0} and ${1}",
        "minLength": "Value length must >= ${0}",
        "maxLength": "Value length must <= ${0}",
        "betweenLength": "Value length must between ${0} and ${1}",
        "email": "Value is not a valid email",
        "url": "Value is not a valid url",
        "mobile": "Value is not a valid mobile no",
        "idno": "Value is not a valid ID No",
        "in": "Value must belong to array[${0}]",
        "legal": "Value is illegal"
    }
}