/**
 * 实例属性
 */
export type InstanceProperty = {
    /**
     * 属性名
     */
    name: string;
    /**
     * 引用实例名
     */
    ref: string;
}

/**
 * 实例配置对象
 */
export type InstanceOption = {
    /**
     * 单例模式，如果为true，表示该类只创建一个实例，调用时，共享调用
     */
    singleton?: boolean;
    /**
     * 参数数组，实例化时需要传入的参数
     */
    params?: Array<unknown>;
}

/**
 * 实例对象，实例工厂中的存储元素
 */
export type InstanceItem = {
    /**
     * 实例对象
     */
    instance?: unknown;
    /**
     * 类引用
     */
    class?: unknown;
    /**
     * 单例标志
     */
    singleton?: boolean;
    /**
     * 构造器参数
     */
    params?: Array<unknown>;
    /**
     * 需要注入的属性列表
     */
    properties?: Map<string, unknown>;
}

/**
 * 注入参数对象，用于存储待注入对象的参数
 */
export type InjectItem = {
    /**
     * 待注入实例
     */
    instance?: unknown,
    /**
     * 待注入类
     */
    clazz?: unknown,
    /**
     * 待注入属性名
     */
    propName: string,
    /**
     * 注入实例名
     */
    injectName: string
}


// {
//     "name":"logAdvice", 			//实例名，不可重复，必填
//     "class":"LogAdvice",			//类名，必填
//     "path":"advice/logadvice",		//模块路径，相对于module_path中的路径，必填
//     "singleton":true,				//是否单例，布尔型，默认true,
//     "properties":[                  //注入对象
//         {
//             "name":"commonTool",    //属性名
//             "ref":"commInstanceTool"//引用实例名
//         }
//     ]
// }