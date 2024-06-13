
/**
 * 连接配置
 */
export type ConnectionConfig = {
    /**
     * noomi数据库包名（如noomi-relaen,noomi-typeorm,noomi-mysql等）
     */
    package: string;
    
    /**
     * 数据源配置，不同数据源配置项不同
     * @remarks
     * 
     * relaen示例
     * 
     * ```json
     * 
     * {
     *   "dialect":"mysql",
     *   "host":"localhost",
     *   "port":3306,
     *   "username":"your user",
     *   "password":"your password",
     *   "database":"your database",
     *   "pool":{
     *       "min":0,
     *       "max":10
     *   },
     *   "entities": [path1,path2,...],
     *   "cache":true,
     *   "debug":true
     * }
     * ```
     * 
     * typeorm示例
     * 
     * ```json
     * {
     *   "type": "mysql",
     *   "host": "localhost",
     *   "port": 3306,
     *   "username": "root",
     *   "password": "field",
     *   "database": "codement",
     *   "logging": true,
     *   "entities": [path1,path2,...]
     * }
     * ```
     * mysql示例
     * 
     * ```json
     * {
     *  "host": "localhost",
     *  "port": 3306,
     *  "user": "your user",
     *  "password": "your password",
     *  "database": "your database",
     *  "connectionLimit": 10
     * }
     * ```
     * 
     * oracle
     * 
     * ```json
     * {
     *   "user":"your user",
     *   "password":"your password",
     *   "connectString":"localhost/your db",
     *   "poolMin":5,
     *   "poolMax":20
     * }
     * ```
     * 
     * mssql server
     * ```json
     * {
     *   "server":"localhost",
     *   "port":1434,
     *   "user":"your user",
     *   "password":"your password",
     *   "database":"your db",
     *   "options": {
     *       //如果使用加密连接，设置为true
     *       "encrypt": false 
     *   }
     * }
     * ```
     */
    options:object;
}

/**
 * 数据库初始化配置对象
 */
export type DbInitOption = {
    /**
     * 是否使用链接池，默认false
     */
    usePool?:boolean;
    /**
     * 数据源配置，需参考各数据源 npm 配置项
     */
    options:object;
    /**
     * 别名
     */
    poolAlias?:string;
}