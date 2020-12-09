/**
 * 模型提示
 */
var NoomiModelTip = {
    zh:{
        "int":"要求整数",
        "float":"要求小数",
        "string":"要求字符串",
        "boolean":"要求布尔型",
        "array":"要求数组",

        "nullable":"不能为空",
        "min":"值必须大于等于${0}",
        "max":"值必须小于等于${0}",
        "between":"值必须在${0}-${1}之间",
        "minLength":"长度必须大于等于${0}",
        "maxLength":"长度必须小于等于${0}",
        "betweenLength":"长度必须在${0}-${1}之间",
        "email":"不是有效的email地址",
        "url":"不是有效的url地址",
        "mobile":"不是有效的移动手机号",
        "idno":"不是有效身份证号",
        "legal":"内容不符合国内法规"
    },
    en:{
        "int":"Need input integer",
        "float":"Need input float",
        "string":"Need input string",
        "boolean":"Need input boolean",
        "array":"Need input array",

        "nullable":"Not allow empty",
        "min":"Value must >= ${0}",
        "max":"Value must <= ${0}",
        "between":"Value must between ${0} and ${1}",
        "minLength":"Value length must >= ${0}",
        "maxLength":"Value length must <= ${0}",
        "betweenLength":"Value length must between ${0} and ${1}",
        "email":"Value is not a valid email",
        "url":"Value is not a valid url",
        "mobile":"Value is not a valid mobile no",
        "idno":"Value is not a valid ID No",
        "legal":"Value is illegal"
    }
}
export{NoomiModelTip}