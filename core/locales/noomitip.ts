var NoomiErrorTip ={
    zh:{
        "0000":"未知错误",
        "0001":"noomi.ini文件配置错误，请参阅官方文档!",
        "0050":"文件不存在",
        "0100":"异常配置文件错误",
        "0500":"web配置文件错误，请参阅官方文档!",
        "0600":"缺少redis配置!",

        "1000":"实例配置文件错误，请参阅官方文档!",
        "1001":"实例${0}不存在",
        "1002":"实例'${0}'已存在，不能重复定义",
        "1003":"模块必须定义为类",
        "1004":"模块路径 '${0}' 不存在",
        "1010":"实例方法 '${0}' 不存在",
        "1011":"实例装饰器参数错误",
        
        "2000":"aop配置文件错误，请参阅官方文档!",
        "2001":"pointcut的expressions参数配置错误",
        "2002":"pointcut '${0}' 不存在",
        "2003":"pointcut '${0}' 已存在，不能重复定义",
        "2005":"advice '${0}' 已经在切面中定义",

        "2100":"路由配置文件错误，请参阅官方文档",
        "2101":"路由结果配置错误",
        "2102":"路由访问错误",
        "2103":"路由'${0}'不存在",

        "2200":"过滤器配置文件错误，请参阅官方文档!",

        "2500":"orm文件配置错误，请参阅官方文档!",

        "2600":"redis文件配置错误，请参阅官方文档!",
        "2601":"redis client '${0}' 不存在",
        
        "2700":"security文件配置错误，请参阅官方文档!",

        "2800":"数据源文件配置错误，请参阅官方文档!",

        "3002":"存入值超过缓存最大值",
        "3010":"键已存在，不能设置为object",
        "3011":"value不能为空"
    },
    en:{
        "0000":"unknown error",
        "0001":"Error in configuration process,noomi.ini may be invalid",
        "0050":"file is not exist",
        "0100":"Error in exception configuration file,Please read the official documentation!",
        "0500":"Error in web configuration file,Please read the official documentation!",
        "0600":"Lack of redis config!",
    
        "1000":"Error in instance configuration file,Please read the official documentation!",
        "1001":"Instance '${0}' does not exist",
        "1002":"Instance '${0}' already exists，it cannot be defined repatedly",
        "1003":"Module must be defined as class",
        "1004":"Module path '${0}' does not exist",
        "1010":"Instance method '${0}' does not exist",
        "1011":"instance decorator params are wrong",
    
        "2000":"Error in aop configuration file,Please read the official documentation!",
        "2001":"Error in expressions parameter configuration of pointcut",
        "2002":"pointcut '${0}' does not exist",
        "2003":"pointcut '${0}' already exists，it cannot be defined repatedly",
        "2005":"advice '${0}' already exists",
    
        "2100":"Error in route configuration file,Please read the official documentation!",
        "2101":"Error in route results configuration",
        "2102":"Error in access route",
        "2103":"Route '${0}' is not exist",
    
        "2200":"Error in filter configuration file,Please read the official documentation!",
    
        "2500":"Error in orm configuration file,Please read the official documentation!",
    
        "2600":"Error in redis configuration file,Please read the official documentation!",
        "2601":"redis client '${0}' does not exist",
    
        "2700":"Error in security configuration file,Please read the official documentation!",
    
        "2800":"Error in data source configuration file,Please read the official documentation!",
    
        "3002":"Attempt to allocate Buffer larger than maximum size",
        "3010":"key already exists，it cannot be defined as object",
        "3011":"need value"
    }
}

var NoomiTip = {
    zh:{
        "0100":"Noomi启动中...",
        "0101":"redis初始化...",
        "0102":"redis初始化完成！",
        "0103":"web初始化...",
        "0104":"web初始化完成！",
        "0105":"实例工厂初始化...",
        "0106":"实例工厂初始化完成！",
        "0107":"过滤器初始化...",
        "0108":"过滤器初始化完成！",
        "0109":"路由工厂初始化...",
        "0110":"路由工厂初始化完成！",
        "0111":"数据源初始化...",
        "0112":"数据源初始化完成！",
        "0113":"aop初始化...",
        "0114":"aop初始化完成！",
        "0115":"security初始化...",
        "0116":"security初始化完成！",
        "0117":"Noomi启动成功！",
        "0118":"地址正被使用，重试中...",
        "0119":"检测并执行启动钩子...",
        "0120":"启动钩子执行结束！",
        "0121":'Http服务器正在运行,监听端口 ${0}',
        "0122":'Https服务器正在运行,监听端口 ${0}'
    },
    en:{
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
    }
}

export{NoomiErrorTip,NoomiTip}