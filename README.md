# Noomi

&emsp; &emsp;一个基于node的企业级框架，基于typescript开发，支持路由、过滤器、IoC、Aop、事务及嵌套、安全框架、缓存、集群。

# 用法
- [起步](#起步)
    - [示例1-hello world](#示例1) 
    - [示例2-IoC](#示例2) 
    - [示例3-Aop](#示例3) 
    - [示例4-数据库操作](#示例4) 
    - [示例5-事务（嵌套）](#示例5) 
- [使用说明](#使用说明)
    - [依赖注入 IoC](#依赖注入IoC)
    - [切面 Aop](#切面Aop)
    - [路由 Route](#路由)
    - [缓存 NCache](#缓存)
    - [会话 Session](#会话)
    - [HttpRequest](#HttpRequest)
    - [HttpResponse](#HttpResponse)
        - [HttpCookie](#HttpCookie)
    - [过滤器 Filter](#过滤器)
    - [异常页工厂 PageFactory](#异常页工厂)
    - [页面缓存 WebCache](#页面缓存)
    - [安全 SecurityFactory](#安全SecurityFactory)
    - [数据库 DataBase](#数据库Database)
    - [事务 Transaction](#事务Transaction)
- [附录](#附录)
    - [附录1-全局配置文件](#附录1)
    - [附录2-安全框架数据表sql](#附录2)
    - [附录3-集群 Cluster](#集群Cluster)
## <a id='起步'>起步</a>

&emsp; &emsp;所有实例在vscode下执行，其它ide工具请相应调整。

### 安装

&emsp; &emsp;npm install noomi -g  
&emsp; &emsp;npm install noomi  
&emsp; &emsp;npm install noomi --save  

### 项目初始化

&emsp; &emsp;创建noomi目录,切换到根目录

#### vs启动配置

&emsp; &emsp;创建.vscode目录，/.vscode 新建launch.json文件，内容如下：

```js
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Launch Program",
            "program":"${file}",
            "preLaunchTask": "tsc: build - tsconfig.json",
            "sourceMaps": true,
            "outFiles": [
                "${workspaceFolder}/**/*.js"
            ],
            "cwd": "${workspaceRoot}"
        }
    ]
}
```

#### typescript配置文件

&emsp; &emsp;在项目根目录新建tsconfig.json文件,内容如下：

```js
{
    "compilerOptions": {
    "module":"commonjs",
    "target": "es2017",
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "outDir":"./dist/module"
  },
  "include":[
     "**/*.ts"
  ],
}
```

### <a id='示例1'>示例1-hello world</a>

#### Noomi项目配置文件

&emsp; &emsp;项目根目录下新建config目录,新建noomi.json（名字不可变）文件,内容如下：

```js
{
    "instance":{
        "instances":["dist/module/**/*.js"]
    }
}
```

#### 模块编写

&emsp; &emsp;项目根目录下新建module目录,新建app.ts文件，内容如下：

```typescript
import { noomi } from "noomitest";
noomi(3000);
```

&emsp; &emsp;新建目录route，/module/route，新建文件hello.ts，内容如下：

```typescript
import { Router, Route} from "noomi";
@Router()
export class Hello{
    @Route('/hello')
    sayHello(){
        return 'hello world!';
    }
}
```

#### 执行和测试

&emsp; &emsp;切换到app.js文件，按F5执行 切换到浏览器，输入localhost:3000/hello，浏览器显示hello world!

### <a id='示例2'>示例2-IoC</a>

&emsp; &emsp;为hello增加一个大写转换器。 切换到module目录，新建/service目录，/module/service, 新建文件charchange.ts，内容如下：

```typescript
import { Instance } from "noomi";
@Instance({name:'charChange'})
export class CharChange{
    toUpper(src:string){
        return src.toUpperCase();
    }
}
```
&emsp; &emsp;修改hello.ts文件，完整内容如下：

```typescript
import { Router, Route, Inject} from "noomi";
import { CharChange } from "../service/charchange";
@Router()
export class Hello{
    //注入
    @Inject('charChange')
    charChange:CharChange;
    @Route('/hello')
    sayHello(){
        return this.charChange.toUpper('hello world!');
    }
}
```

&emsp; &emsp;切换到浏览器，输入localhost:3000/hello，输出变大写, ，浏览器显示HELLO WORLD!

### <a id='示例3'>示例3-Aop</a>

&emsp; &emsp;为业务方法增加aop拦截 在module目录下增加aop目录，/module/aop。 新建logadvice.ts文件，内容如下：

```typescript
import { Aspect, Pointcut, Before, Around, AfterThrow, After, AfterReturn, Instance } from "noomi";
@Instance({
    name:'logAdvice'
})
@Aspect()
export class LogAdvice{
    @Pointcut(["charChange.*"])
    testPointcut(){}

    @Before("testPointcut()")
    before(){
        let o = arguments[0];
        console.log(`前置通知:"实例名:${o.instanceName};方法名:${o.methodName};参数:${o.params}`);
    }
    @After("testPointcut()")
    after(){
        console.log("注释后置通知",arguments[0].methodName);
    }

    @Around("testPointcut()")
    around(){
        console.log("注释环绕通知",arguments[0].methodName);
    }

    @AfterThrow("testPointcut()")
    afterThrow(){
        console.log("注释异常通知",arguments[0].methodName);
    }

    @AfterReturn("testPointcut()")
    afterReturn(args){
        console.log("只是返回通知",arguments[0].methodName);
    }
}
```

&emsp; &emsp;切换到浏览器，输入localhost:3000/hello，控制台输出如下：

```typescript
前置通知:"实例名:charChange;方法名:toUpper;参数:hello world!
logadvice.ts:13
注释环绕通知 toUpper 
logadvice.ts:22
只是返回通知 toUpper 
logadvice.ts:32
注释后置通知 toUpper 
logadvice.ts:17
注释环绕通知 toUpper
```

### <a id='示例4'>示例4-数据库操作</a>

以mysql为例. 创建数据库 noomi

```sql
create database noomi default character set ‘utf8’;
```

切换数据库

```sql
use noomi;
```

创建表

```sql
create table t_user(
    id int(11) not null auto_increment,
	name varchar(32),
	age int(11),
	mobile char(11),
	primary key(id)
);
```

修改config/noomi.json文件，增加数据源配置，完整配置如下：

```js
{
    "instance":{
        "instances":["dist/module/**/*.js"]
    },
    "database":{
        "product":"mysql",
        "use_pool":true,
        "options":{
            "host":"localhost",
            "port":3306,
            "user":"root",
            "password":"your password",
            "database":"noomi",
            "connectionLimit":10
        }
    }
}
```

在module/route 目录下增加useraction.ts文件，代码如下：

```typescript
import { BaseAction, Router, Inject } from "noomi";
import { UserService } from "../service/userservice";
@Router({
    namespace:'/user',
    path:'/'
})
export class UserAction extends BaseAction{
    @Inject('userService')
    userService:UserService;

    async add(){
        try{
            let r = await this.userService.addUser(this.model.name,this.model.age,this.model.mobile);
            return {success:true,result:{id:r}}
        }catch(e){
            return {success:false,msg:e};
        }
    }
}
```

在module/service目录下增加userservice.ts文件，代码如下：

```typescript
import { getConnection, Instance } from "noomi";
@Instance('userService')
export class UserService{
    async addUser(name:string,age:string,mobile:string):Promise<number>{
        let conn:any = await getConnection();
        let r:any = await new Promise((resolve,reject)=>{
            conn.query('insert into t_user(name,age,mobile) values(?,?,?)',
            [name,age,mobile],
            (err,results)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(results);
                }
                closeConnection(conn);
            });
        });
        return r.insertId;
    }
}
```

切换到浏览器，输入http://localhost:3000/user/add?name=noomi&age=1&mobile=13808080808  
 得到返回内容  
 {"success":true,"result":{"id":1}}  
 查看数据库t_user表，查看数据是否已经加入。

### <a id='示例5'>示例5-事务（嵌套）</a>

&emsp; &emsp;在config/noomi.json的database项中增加事务配置，完整配置文件如下：

```js
{
    "instance":{
        "instances":["dist/module/**/*.js"]
    },
    "database":{
        "product":"mysql",
        "use_pool":true,
        "options":{
            "host":"localhost",
            "port":3306,
            "user":"root",
            "password":"field",
            "database":"noomi",
            "connectionLimit":10
        },
        "transaction":{}
    }
}
```

在route/useraction.ts下增加addtwo方法，完整代码如下：

```typescript
import { BaseAction, Router, Inject } from "noomi";
import { UserService } from "../service/userservice";
@Router({
    namespace:'/user',
    path:'/'
})
export class UserAction extends BaseAction{
    @Inject('userService')
    userService:UserService;
    async add(){
        try{
            let r = await this.userService.addUser(
                this.model.name,
                this.model.age,
                this.model.mobile
            );
            return {success:true,result:{id:r}}
        }catch(e){
            return {success:false,msg:e};
        }
    }
    async addtwo(){
        try{
            let r = await this.userService.addTwoUser(
                this.model.id,
                this.model.name,
                this.model.age,
                this.model.mobile
            );
            return {success:true,result:{id:r}}
        }catch(e){
            return {success:false,msg:e};
        }
    }
}
```

在module/service/userservice.ts文件中增加addUserWithId和addTwoUser方法，完整代码如下：

```typescript
import { getConnection, Instance, Transactioner, closeConnection } from "noomi";
//Transactioner注解器把UserService类的所有方法注册为事务方法
@Transactioner()
@Instance('userService')
export class UserService{
    async addUser(
        name:string,
        age:string,
        mobile:string):Promise<number>{
        let conn:any = await getConnection();
        let r:any = await new Promise((resolve,reject)=>{
            conn.query('insert into t_user(name,age,mobile) values(?,?,?)',
            [name,age,mobile],
            (err,results)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(results);
                }
            });
        });
        return r.insertId;
    }
    async addUserWithId(
        id:string,
        name:string,
        age:string,
        mobile:string):Promise<number>{
        let conn:any = await getConnection();
        let r:any = await new Promise((resolve,reject)=>{
            conn.query('insert into t_user(id,name,age,mobile) values(?,?,?,?)',
            [id,name,age,mobile],
            (err,results)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(results);
                }
            });
        });
        return r.insertId;
    }
    async addTwoUser(id:string,
        name:string,
        age:string,
        mobile:string):Promise<any>{
        //如果传入的主键id在数据表中已经存在，则会回滚事务，
        // 否则添加两条name age mobile相同，id不同的数据记录
        await this.addUser(name,age,mobile);
        await this.addUserWithId(id,name,age,mobile);
    }
}
```

切换到浏览器，输入网址：http://localhost:3000/user/addtwo?id=5&name=nodom&age=3&mobile=13800000000  
 ***当t_user表中有id为5的数据记录时，一条记录都不会加入，否则会增加两条记录。***

## <a id='使用说明'>使用说明</a>

***注:参数为[]时，代表可选参数***
### <a id='依赖注入IoC'>依赖注入 IoC</a>
使用框架来对实例进行统一管理，支持IoC，提供配置文件和注解两种方式使用。
#### 配置方式
在noomi.json中增加instance项，内容如下：
```js
//实例配置，用于IoC
{
    //模块基础路径(可选配置)，模块从该路径中加载，配置该路径后，模块路径采用相对路径配置，
    // 注：该路径为js路径，而不是ts路径
    "module_path":["/dist/test/app/module"],
    //实例数组，两种配置方式，如果数组元素为字符串，则加载符合路径规则的所有模块，
    //如果为对象，则单个加载模块
    //所有模块必须为class
    "instances":[
        //字符串模式，加载/build/test/app/module/目录及其子孙目录下的js文件，**表示自己及所有子孙目录
        //模块类必须用@Instance或@RouteConfig注解
        "/dist/test/app/module/**/*.js",
        //对象模式，加载单个模块
        {
            "name":"logAdvice", 			//实例名，不可重复，必填
            "class":"LogAdvice",			//类名，必填
            "path":"advice/logadvice",		//模块路径，相对于module_path中的路径，必填
            "singleton":true				//是否单例，布尔型，默认true
        }
    ],
    //配置子路径(可选配置)，相对与初始的application的context路径(该路径在noomi初始化时传入，默认/context)
    //当模块过多时，可采用该方式分路径配置
    "files":["context/action.json"]
}
```
***注:该内容可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"instance"。***

#### 注解方式
```typescript
/*cfg:object|string 如果为string，则表示实例名
 *    name:string     实例名，必填
 *    singleton:bool  是否单例，默认false
 */
@Instance(cfg)

/**
 * IoC注入装饰器，装饰属性
 * @param instanceName:string  实例名，必填
 */
@Inject(instanceName)
```
例:

```typescript
@Instance({
    name:'testService'
})
class TestService{
    @Inject("dateImpl")
    dateImpl:DateImpl;
    getInfo(){
        return this.dateImpl.getinfo();
    }
}
```

### <a id='切面Aop'>切面 Aop</a>

aop支持配置和注解的两种方式
#### 配置方式
在noomi.json中增加aop项，内容如下：
```js
//aop配置，如果为注解方式，则不用配置
{
    //子文件列表，表示可以加载的子aop文件
    "files":[],  
    //切点，可以配置多个
    "pointcuts":[{
        //切点id，必填，不可重复
        "id":"pointcut1",
        //表达式，必填，符合该表达式的方法会被拦截，可以采用通配符
        //如下，第一个表示拦截实例名为userService的getInfo方法
        //第二个表示拦截实例名以service开头的所有实例的所有方法（实例必须加入实例工厂，即用注解或在instance中配置）
        "expressions":["userService.getInfo","service*.*"]   
    }],
    //切面，可以多个
    "aspects":[
        {
            //切面对应的实例名，必填
            "instance":"logAdvice",
            //通知，必填
            "advices":[
                {
                    //通知对应的切点
                    "pointcut_id":"pointcut1",	
                    //通知类型，字符串，必填，取值范围:before(前置),after(后置),after-return(return),after-throw(抛出异常),around(环绕，即前后置)
                    "type":"before",
                    //切面对应实例的方法名，字符串，必填
                    "method":"before"
                },{
                    "pointcut_id":"pointcut1",
                    "type":"after",
                    "method":"after"
                },{
                    "pointcut_id":"pointcut1",
                    "type":"after-return",
                    "method":"afterReturn"
                },{
                    "pointcut_id":"pointcut1",
                    "type":"after-throw",
                    "method":"throw"
                },{
                    "pointcut_id":"pointcut1",
                    "type":"around",
                    "method":"around"
                }	
            ]
        }
    ]
}
```
***注:该内容可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"aop"。***

#### 注解方式
```typescript
@Aspect() //切面
/* expressions: string|Array<string> 切点需要拦截的表达式串或数组，支持通配符*，
 *                                    拦截对象为instanceName.methodName，
 *                                    如user*.*拦截实例名为user开头的实例下的所有方法，
 *                                    userX.m1拦截实例名为userX的m1方法
 */
@Pointcut(expressions) //切点
/* 
 *  pointcutId:string    切点id
 */
@Before(pointcutId) //前置

@After(pointcutId)  // 后置

@Around(pointcutId) //环绕

@AfterThrow(pointcutId) //异常

@AfterReturn(pointcutId) //返回
```

例:

```typescript
@Instance({
    name:'testAdvice'
})
@Aspect()
class TestAdvice{
    @Pointcut(["dataImpl.*"])
    testPointcut(){}
    
    @Before("testPointcut()")
    before(){
        console.log("注解前置通知",arguments[0].methodName);
    }
    @After("testPointcut()")
    after(){
        console.log("注释后置通知",arguments[0].methodName);
    }
    @Around("testPointcut()")
    around(){
        console.log("注释环绕通知",arguments[0].methodName);
    }
    @AfterThrow("testPointcut()")
    afterThrow(){
        console.log("注释异常通知",arguments[0].methodName);
    }
    @AfterReturn("testPointcut()")
    afterReturn(args){
        console.log("只是返回通知",arguments[0].methodName);
    }
}
```

### <a id='路由'>路由 Route</a>
使用框架路由完成浏览器与服务器进行交互，路由支持配置和注解的两种方式。
#### 配置方式
在noomi.json中增加route项，内容如下：
```js
{
    //路由命名空间
    "namespace":"",
    //子文件，相对于app的configPath路径
    "files":["route/subroute.json"],    
    //路由配置
    "routes":[              			
        {
            //路径（通过浏览器访问的路径），字符串，必填，以/开头
            //如果路径最后为*，表示该实例下的方法匹配
            //如 /upload_*，则/upload_add表示调用uploadAction实例的add方法
            "path":"/upload",				
            "instance_name":"uploadAction",	//实例名，字符串，必填
            "method":"upload",      		//方法，字符串，可选，当path中带
            //路由结果集，如果不填，则默认为json，方法return值（必须为json格式）将回写到请求端
            "results":[{
                //方法返回值，如果return 1，则调用该路由结果
                "value":1, 					
                //返回类型，字符串，可选值：redirect(重定向),chain(路由链),none(什么都不做),json(回写json到请求端)，默认json
                "type":"redirect",		
                //如果type为redirect和chain，则此项必填
                //为redirect，则为页面或路由路径，为chain时，必须为路由路径
                "url":"/user/showinfo",
                //参数列表，如果url为路由路径，则会从现路由对应的实例中取参数列表对应的属性并作为参数传递到下个路由
                "params":["userName"]
            },{
                //方法返回值，如果return 2，则调用该路由结果
                "value":2,
                "type":"chain",
                "url":"/user/last",
                "params":["type"]
            }]
        }
    ]
}
```
***注:该内容可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"route"。***

#### 配置方式
```js
@Router(cfg)
/* @param cfg:object
 * namespace:string  命名空间，namespace+该类下的所有方法对应的路由路径=路由完整路径，可选
 * path:string 路径，路由路径为 namespace+path+方法名，设置时，对所有方法有效，可选
 */

@Route(cfg)
/* @param cfg:object|string          如果为string，则为路由路径，默认type json
 *            path:string            路由路径，必填
 *            results:Array<object>  结果数组，可选，如果results未设置或数组长度为0，则按json处理，单个结果元素包含:
 *             value:any             方法返回结果，如果return值与value相同，则使用该结果
 *             type:string           结果类型，可选值:redirect(重定向),chain(路由链),void(空),json，默认为json
 *             url:string,           该方法对应的路由路径，完整路径=namespace+url，以/开头，如Router装饰器设置的namespace为/user,url为/getinfo,则访问路由为/user/getinfo
 *                                    type为redirect或chain时必须设置
 *            params:Array<string>    参数名数组，当url为路由时，params中存放当前路由所处实例的属性名，将属性名和其对应值加入url指向路由的输入参数
 *                                    如params:['p1','p2']，则传入url路由时的参数为{p1:v1,p2:v2}和路由自带的参数，可选
```

例:

```typescript
@Router({
    namespace:'/user',
})
class UserAction extends BaseAction{
    @Route('/showinfo')
    showinfo(){
        return success;
    } 
}
```

### <a id='缓存'>缓存 NCache</a>

**使用NCache时，首先将创建Ncache对象**

```typescript 
const cache = new NCache([cfg])
```

+ cfg<CacheCfg>

  - saveType <number>为0表示存在内存，为1表示存在redis中 

  - name <string> 缓存空间名称
  - [redis] <string> redis名称
  - [maxSize]<number> 最大空间，默认为0，saveType为1时设置无效

当saveType为1时，需要配置redis信息,需要在noomi.json中配置redis，内容如下:

```js
[{
    "name":"default",  //redis名称
    "host":"localhost", 
    "port":"6379"
}]
```
***注:该内容可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"redis"。***

#### async set(item[,timeout])

**将CacheItem实例存入缓存中**

+ Item<CacheItem>
  - key <string>键
  - [subkey] <string>子键
  - value <any>值   
  - [timeout]<number> 超时时间(秒)

+ timeout<number>超时时间

#### async get(key[,subkey,changeExpire])

**获取缓存中的值**

+ key:<string> 键
+ subkey:<string> 子键
+ changeExpire:<boolean> 是否更新过期时间

例：

```typescript
(async ()=>{
   //...创建实例
    await n.set({
        key:'mytest',
        value:'this is the test',
        timeout:60
    })
    let v = await n.get(
        'mytest',
    )
    console.log(v);
})();
//控制台输出
//this is the test
```

#### async del(key[,subkey])

**删除缓存**

+ key:<string> 键
+ subkey:<string> 子键

#### async has(key)

**是否存在key**,**返回true/false**

+ key:<string> 键

#### async getkeys(key)

**是否存在key,返回一组key<Array<string>>**

+ key:<string> 键

例:

```typescript
await n.set({
    key:'mytest1',
    value:'this is the test1',
    timeout:60
});
await n.set({
    key:'mytest2',
    value:'this is the test12',
    timeout:60
});
console.log(await n.getKeys('mytest*'));
await n.del('mytest1');
console.log(await n.has('mytest1'));
//控制台输出
//Array(2)["mytest1", "mytest2"]
//false
```

### <a id='会话'>会话 Session</a>

在使用Session时，推荐在noomi.json的web配置项中配置session信息。

```js
//session配置(可选配置)
{
    "name":"NSESSIONID", //set-cookie中的sessionId名，默认为NOOMISESSIONID
    "timeout":30,		 //session超时时间，单位:分钟
    "save_type":0,		 //存储类型 0 memory, 1 redis，需要安装redis服务器并启动服务
    "max_size":20000000, //缓存最大字节数，save_type为0时有效
    "redis":"default"	 //redis client名，与redis配置保持一直，默认default
}
```

#### SessionFactory
##### static async getsession(req)

返回**session类的实例**

+ req<HttpRequest>

##### static getSessionId(req)

返回**session实例的参数id**<string>

+ req<HttpRequest>

##### static async delSession(sessionId)

**删除参数id对应的session实例**

+ sessionId<string>

#### Session

##### async set(key,value)

**设置session实例的参数**

+ key<string>
+ value<any>

##### async get(key)

**返回session实例的参数value**<any>

+ key<string>

##### async del(key)

**删除session实例的参数key**

+ key<string>

例:

```typescript
async getdata(){
    let session = await SessionFactory.getSession(this.request); //获取session
    await session.set('name','tom');   //session设置值
    let value = await session.get('name');  //获取session的值
    return {
        success:true,
        result:value
    }
}
//路由返回结果
/*success:true
result: tom */
```

### <a id='#HttpRequest'>HttpRequest</a>

**HttpRequest继承IncomingMessage类**

***注:当需要操作原生request对象时，通过实例HttpRequest.srcReq获取***

#### getHeader(key:string)

**根据参数返回请求头信息**<any>

+ key<string>请求头参数

#### getMethod()

**返回请求方法名**<string>

#### getUrl()

**返回请求路径**<string>

#### setParameter(name,value)

设置请求参数

+ name<string>参数名
+ value<string>参数值

#### getparametre(name)

**根据参数名获取请求参数值**<any>

+  name<string>参数名

#### getAllParameter()

**返回请求所有参数**<any>

### <a id='HttpResponse'>HttpResponse</a>

**HttpResponse继承ServerResponse类**

***注:当需要操作原生response对象时，通过实例HttpResponse.srcRes获取***

#### writeToClient(config)

  **回写到浏览器端**

+ config<WriteCfg>
  - [data]<any>   数据
  - [charset]<string>  字符集
  - [type]<string> 数据类型
  - [statusCode]<number> 状态码
  - [crossDomain]<boolean> 是否跨域

#### setHeader(key,value) 

**设置响应头**

+  key<string> 
+ value<any>

#### <a id='HttpCookie'>HttpCookie</a>

**从HttpResponse实例中获取cookie<HttpCookie>参数，对cookie进行操作**

##### set(key,value) 

**设置cookie**

+ key<string> 键
+ value<string> 值

##### get(key)

**通过键值获取cookie值**

+ key<string> 键

##### getAll()

**获取cookie实例所有参数**

##### remove(key)

**通过键值删除cookie**

+ key<string> 键

``` typescript
@Route('/getHttpInfo')
getHttpInfo(){
    let Info ={
        method:  this.request.getMethod(), 
        url   :  this.request.getUrl(),
        cookie: this.request.getHeader('cookie')
    }
    console.log(this.response.cookie.getAll());
    return Info;
} 
//注:this.request为BaseAction中的参数 该类继承BaseAction
//返回结果 
/* method:  “GET”
   url:     ”/getHttpInfo”
   cooike:  ”/NSESSIONID=dc7d6620-06be-11ea-83f0-c5675e73ac6d” 
*/       
 //控制台结果
/*dc7d6620-06be-11ea-83f0-c5675e73ac6d
  Map(2) {}
  0:{"NSESSIONID" => "dc7d6620-06be-11ea-83f0-c5675e73ac6d"} 
  1:{"Expires" => "Thu, 14 Nov 2019 10:01:47 GMT"} 
*/
```


### <a id='过滤器'>过滤器 Filter</a>

过滤器用于过滤请求url，并对url或参数做相应操作，在route执行前执行，noomi支持路由器链。  
过滤器支持优先级，1-10为框架预留过滤器优先级，用户自定义过滤器时，请把优先级置于10以上，或不设置。  
过滤器由实例工厂统一管理，所以需要添加到实例工厂。 
过滤器支持配置和注解方式。
#### 配置方式
配置方式如果没有指定优先级，则按配置先后顺序执行。
当配置过滤器时，需要在noomi.json的配置filter项，内容如下:  
```js
{
    "filters":[
        {
            "instance_name":"pathFilter",   //实例名，必填
            "url_pattern":"/*",             //过滤url，支持通配符*，默认 "/*"
            "method_name":"do2"             //实例中的方法名，默认do
        } 
    ]
}
```
***注:filter配置可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"filter"。***

#### 注解方式
**推荐使用注解方式配置过滤**

``` typescript
/*
 * @param pattern:string|Array<string>  过滤表达式串或数组，支持通配符，默认为/*，过滤所有路由
 * @param order:number                  优先级，值越小优先级越高，默认10000，可选
 */
@WebFilter([pattern,order])
```

***注:在使用注解配置自定义过滤器时，建议order的优先级设置为10之后，防止与框架中的过滤器优先级冲突。***

例:

```typescript
@Instance({
    name:'nodomFilter'
})
class NodomFilter{
    @WebFilter('/*',99)
    do(request,response){
        const url = require("url");
        let path = url.parse(request.url).pathname;
        if(path.indexOf('/test/router') === 0){
            console.log('nodom filter wrong',path);
        } else{
            console.log('nodom filter',path);
        }
        return true;
    }
}
```

### <a id='异常页工厂'>异常页工厂 PageFactory</a>

在使用Session时，推荐在noomi.json的web配置项中配置error_page信息。

```js
//http异常页配置(可选配置)，如果http异常码在该配置中，则重定向到该异常码对应的页面
[{
    //异常码，类型：数字
    "code":404,
    //页面地址，相对于项目跟路径，以/开始
    "location":"/pages/error/404.html"	
},{
    "code":403,
    "location":"/pages/error/403.html"
}]
```

#### addErrorPage(code,url)

**添加错误提示页**

+ code<number> 错误码
+ url<string> 页面地址

#### getErrorPage(code)

**获取错误提示页路径**

+ code<number> 错误码

### <a id='页面缓存'>页面缓存 WebCache</a>

在使用Session时，需要在noomi.json的web配置项中配置web_config信息。

```js

{
    "upload_tmp_dir":"/upload/tmp", //上传临时目录，相对于项目根目录，以/开始
    "upload_max_size":0,			//上传内容最大字节数
    "forbidden_path":["/test/app"], //限制路径，访问该路径时，返回404
    "cache":true,					//是否启用静态资源缓存，如果为false，则cache_option无效，默认false
    "cache_option":{				//静态资源缓存配置
        "save_type":0,  			//存储类型 0 memory, 1 redis，需要安装redis服务器并启动服务
        "max_size":20000000,		//缓存最大字节数，save_type为0时有效
        "file_type":[".html",".htm",".js",".css"],	//缓存静态资源类型，默认['*']，缓存所有静态资源，不建议使用*
        "redis":"default",			//redis client名，与redis配置保持一直，默认default
        "expires":0,				//页面缓存 expires 属性
        "max_age":0,				//cache-control中的max-age属性
        "public":true,				//cache-control中的public属性，优先级高于private配置，即public和private同时为true时，设置public
        "private":true,				//cache-control中的private属性
        "no_cache":false,			//cache-control中的no-cache属性
        "no_store":false,			//cache-control中的no-store属性
        "must_revalidation":false,	//cache-control中的must-revalidation属性
        "proxy_revalidation":false  //cache-control中的proxy-revalidation属性
    }
}
```

#### static async add(url,path,data[,response])

+ url<string> 资源存放路径
+ path<string> 资源路径
+ data<any> 资源数据
+ response<HttpResponse>

#### static async load(request,response,url)

+ request<HttpRequest>
+ response<HttpRequest>
+ url<string>

***注:web配置可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"web"。格式如下：***
```js
{
    "web_config":***,
    "session":***,
    "error_page":***
}
```

### <a id='安全SecurityFactory'>安全 SecurityFactory</a>
框架提供基于数据库的安全鉴权机制，需要创建安全相关的数据表和配置数据库，创建表sql见[附录2](#附录2)。 
当使用安全框架时，需要在noomi.json的配置security信息，内容如下:

```js
//安全框架配置，当需要使用noomi的安全框架时，需要配置
"security":{
    "save_type":0,				//同session配置
    "max_size":10000000,		//同session配置
    "redis":"default",			//同session配置
    //过滤器针对的路由路径，如果不设置，则默为/*，表示拦截所有请求(只针对路由)
    //"expressions":["/*"], 
    //数据库相关设置
    "dboption":{
        //数据库连接设置，如果没有配置database，则此项必填，否则使用数据库配置中的数据库connection manager
        "conn_cfg":{
            "user":"root",
            "password":"field",
            "host":"localhost",
            "database":"codement"
        },
        //鉴权相关数据表名字映射，如果与默认值相同，则不用配置，数据表结构详情请参考安全管理器节
        "tables":{
            "groupAuthority":"t_group_authority", 		//组权限表名，默认t_group_authority
            "resource":"t_resource",					//资源表名，默认t_resource
            "resourceAuthority":"t_resource_authority"	//资源权限表名，默认t_resource_authority
        },
        //鉴权相关字段名映射，如果与默认值相同，则不用配置
        "columns":{
            "resourceId":"resource_id",					//资源id字段名，默认resource_id
            "authorityId":"authority_id",				//权限id字段名，默认authority_id
            "resourceUrl":"url",						//资源url字段名，默认url
            "groupId":"group_id"						//组id字段名，默认group_id
        }
    },
    "auth_fail_url":"/pages/error/403.html",			//鉴权失败页面路径，必填
    "login_url":"/pages/login.html"						//登录页面，必填
}
```
***注1:security配置可以放在独立文件中（目录与noomi.json相同目录或子目录），在noomi.json中以路径方式引入，也可以在noomi.json中以对象方式配置。配置项为"security"。***
***注2:SecurityFactory提供的所有操作只限于在安全框架中的管理(默认数据放在缓存),当在数据库中更新了权限信息后，请使用操作将数据更新到安全框架，或重启服务。***

#### static async getPreLoginInfo(request)

**返回鉴权前的页面路径**

+ url<string>

+ request<HttpRequest>

#### 用户管理

##### static async addUserGroups(userId,groups[,request])

**添加用户以及用户对应的组**

+ userId<number> 用户id
+ groups<Array<number>> 组，一个用户可能存在在多个组中
+ request<HttpRequest> 当request存在时，会将用户id添加至session中

##### static async deleteUser(userId[,request]) 

**删除用户**

+ userId<number>
+ request<HttpRequest> 若request存在，则同时删除session中的用户信息

##### static async deleteUserGroup(userId,groupId)

**从一个组中删除用户**

+ userId<number>
+ groupId<number>

#### 组管理

##### static async addGroupAuthority(groupId,authId)

**添加组以及组权限**

+ groupId<number> 组id
+ authId<number> 权限id

##### static async updGroupAuths(groupId,authIds)

**添加一个组的多个权限**

+ groupId<number> 组id
+ authIds<Array<number>> 权限id

##### static async deleteGroupAuthority(groupId,authId)

**删除组的权限**

+ groupId<number>
+ authId<number>

##### static async deleteGroup(groupId)

**删除组**

+ groupId<number>

####资源管理

##### static async addResourceAuth(url,authId)

**添加资源权限**

+ url<string> 资源路径
+ authId<number> 权限id

##### static async updResourceAuths(url,auths)

**添加资源以及其对应的多个权限**

+ url<string>资源路径
+ auths<Array<number>> 权限id

##### static async deleteResource(url)

**删除资源**

+ url<string> 资源路径

##### static async deleteResourceAuthority(url,authId)

**删除资源权限**

+ url<string> 资源路径
+ authId<number> 权限id

##### static async deleteAuthority(authId)

**删除权限,同时从组和资源中同时删除**

+ authId<number> 权限id

例：

```typescript
toPage: string;
@Route({
    "path": "/testlogin",
    "results": [{
        "type": "redirect",
        "url": "${toPage}"
    }]
})  
async Testlogin() {
    await SecurityFactory.updGroupAuths(3,[5]); //添加组权限  第三组拥有的权限编号为5
    await SecurityFactory.addResourceAuth("/user/getinfo", 5);//资源访问权限编号为5       
    let userid = 1; //此处假设从session中获取到了userid 
    await SecurityFactory.addUserGroups(userid, [3], this.request);//将userid加入权限编号为3的组
    if(userid){
        this.toPage = await SecurityFactory.getPreLoginInfo(this.request);
        if (!this.toPage) {
            this.toPage = '/pages/loginsuccess.html';
        }
    }
    else {
        this.toPage = '/pages/loginfail.html';
    }
}
//鉴权成功，跳转到鉴权前的页面
```
### <a id='#数据库Database'>数据库 Database</a>
noomi支持4种connection manager：mysql、oracle、mssql、sequelize，用户可以自定义connection manager，自定义connection manager需要加入InstanceFactory。  
使用数据源，需要在noomi.json中配置database属性，典型配置如下：
#### mysql配置
```js
{
    "product":"mysql",
    "use_pool":true,  //是否支持连接池，如果为true，options需要设置connectionLimit
    //"connection_manager":"connection manager instance name", //自定义connection manager
    "options":{
        "host":"localhost",
        "port":3306,
        "user":"your user",
        "password":"your password",
        "database":"your database",
        "connectionLimit":10
    }
}
```
***注:options参考 npm mysql配置***
#### oracle配置
```js
{
    "product":"oracle",
    "use_pool":true,
    "options":{
        "user":"your user",
        "password":"your password",
        "connectString":"localhost/your database",
        "poolMin":5,
        "poolMax":20
    }
}
```
***注:options参考 npm oracle配置***
#### mssql配置
```js
{
    "product":"mssql",
    "use_pool":true,
    "options":{
        "server":"localhost",
        "port":1434,
        "user":"your user",
        "password":"your password",
        "database":"your database"
    }
}
```
***注:options参考 npm mssql配置***
#### sequelize配置
```js
{
    "product":"sequelize",
    "use_pool":true,
    "options":{
        "dialect":"mysql/oracle/mssql...",
        "host":"localhost",
        "port":3306,
        "username":"your user",
        "password":"your password",
        "database":"your database",
        "pool": {
            "max": 5,
            "min": 0,
            "acquire": 30000,
            "idle": 10000
        },
        "define": {
            "timestamps": false
        }
    }
}
```
***注:options参考 npm sequelize配置***
#### async getConnection():any
**从connection manager得到一个连接**  
不同的product返回的内容不一样
+ mysql 返回 connection对象
+ oracle 返回connection对象
+ mssql 返回request对象
+ sequelize 返回sequelize对象
#### async closeConnection(connection:any):void
**关闭连接**  
如果调用方法getConnection获取连接，则需要用该方法进行手动关闭。  
***注:如果该方法为事务方法，则不手动关闭连接，由事务管理器(TransactionManager)进行关闭。***
### <a id='事务Transaction'>事务Transaction</a>
noomi支持事务及嵌套事务，事务分为配置和注解两种方式。
#### 配置事务
在noomi.json的database配置项中增加transaction配置  
```js
    "transaction":{
        // "transaction":"mysqlTransaction",//自定义事务类时需要配置，否则直接根据product自动产生
        //"isolation_level":1,//隔离级 1read uncommited 2read commited 3repeatable read 4serializable
        "expressions":["userService.add*",...] //表达式数组，instanceName.methodName符合表达式的方法会被作为事务方法
    }
```
#### 注解事务
和配置事务方式一样，需要在database配置项中增加transaction配置，不同的是不需要设置expressions
```js
"transaction":{}
```
##### Transactioner装饰器
该装饰器用于类的注解。  
使用方式：  
```typescript
@Transactioner(methodReg?:any)  
class MyClass{
    ...
}
```
methodReg:过滤方法，支持通配符*，用于过滤类中的方法，如果方法名符合，则会作为事务方法。如果为空，则匹配类中的所有方法。
如@Transactioner("add*")把类中所有以“add”开头的方法作为事务方法。  
***注:使用时，Transactioner装饰器必须放在Instance装饰器的前面。***
##### Transactional装饰器
该装饰器用于方法的注解。
使用方式：
```typescript  
class MyClass{
    @Transactional()
    myMethod(){
        ...
    }
}
```  
该装饰器注解的方法会被作为事务方法。

## <a id='附录'>附录</a>
### <a id='附录1'>附录1-全局配置文件</a>
```js

{
	//框架提示语言(可选配置)，zh中文，en英文，默认zh
	"language":"zh", 
	//web服务器相关设置(可选配置)，如果为对象，则直接使用对象，如果为字符串，则表示web配置文件路径
	"web":{
		"web_config":{
			"upload_tmp_dir":"/upload/tmp", //上传临时目录，相对于项目根目录，以/开始
			"upload_max_size":0,			//上传内容最大字节数
			"forbidden_path":["/test/app"], //限制路径，访问该路径时，返回404
			"cache":true,					//是否启用静态资源缓存，如果为false，则cache_option无效，默认false
			"cache_option":{				//静态资源缓存配置
				"save_type":0,  			//存储类型 0 memory, 1 redis，需要安装redis服务器并启动服务
				"max_size":20000000,		//缓存最大字节数，save_type为0时有效
				//缓存静态资源类型，默认['*']，缓存所有静态资源，不建议使用*
				"file_type":[".html",".htm",".js",".css"],	
				"redis":"default",			//redis client名，与redis配置保持一直，默认default
				"expires":0,				//页面缓存 expires 属性
				"max_age":0,				//cache-control中的max-age属性
				//cache-control中的public属性，优先级高于private配置，即public和private同时为true时，设置public
				"public":true,				
				"private":true,				//cache-control中的private属性
				"no_cache":false,			//cache-control中的no-cache属性
				"no_store":false,			//cache-control中的no-store属性
				"must_revalidation":false,	//cache-control中的must-revalidation属性
				"proxy_revalidation":false  //cache-control中的proxy-revalidation属性
			}
		},
		//session配置(可选配置)
		"session":{
			"name":"NSESSIONID", 			//set-cookie中的sessionId名，默认为NOOMISESSIONID
			"timeout":30,					//session超时时间，单位:分钟
			"save_type":0,					//存储类型 0 memory, 1 redis，需要安装redis服务器并启动服务
			"max_size":20000000,			//缓存最大字节数，save_type为0时有效
			"redis":"default"				//redis client名，与redis配置保持一直，默认default
		},
		//http异常页配置(可选配置)，如果http异常码在该配置中，则重定向到该异常码对应的页面
		"error_page":[
			{
				//异常码，类型：数字
				"code":404,
				//页面地址，相对于项目跟路径，以/开始
				"location":"/pages/error/404.html"	
			},{
				"code":403,
				"location":"/pages/error/403.html"
			}
		]
    },
	// web文件配置方式
	//"web":"web.json",
	//实例配置，用于IoC
	"instance":{
		//模块基础路径(可选配置)，模块从该路径中加载，配置该路径后，模块路径采用相对路径配置，
		// 注：该路径为js路径，而不是ts路径
		"module_path":["/dist/test/app/module"],
		//实例数组，两种配置方式，如果数组元素为字符串，则加载符合路径规则的所有模块，
		//如果为对象，则单个加载模块
		//所有模块必须为class
		"instances":[
			//字符串模式，加载/build/test/app/module/目录及其子孙目录下的js文件，**表示自己及所有子孙目录
			//模块类必须用@Instance或@RouteConfig注解
			"/dist/test/app/module/**/*.js",
			//对象模式，加载单个模块
			{
				"name":"logAdvice", 			//实例名，不可重复，必填
				"class":"LogAdvice",			//类名，必填
				"path":"advice/logadvice",		//模块路径，相对于module_path中的路径，必填
				"singleton":true				//是否单例，布尔型，默认true
			}
		],
		//配置子路径(可选配置)，相对与初始的application的context路径(该路径在noomi初始化时传入，默认/context)
		//当模块过多时，可采用该方式分路径配置
		"files":["context/action.json"]
	},
	//实例配置，文件方式
	//"instance":"instance.json", 
	//数据库配置，如果不需要使用数据库，则不用配置
	"database":{
		//数据库产品，字符串，可选值：mysql,oracle,mssql,sequelize，默认mysql
		"product":"mysql",
		//连接管理器实例名，字符串，如果不设置，则根据product自动生成，如product为mysql，
		//则connection_manager为mysqlConnectionManager，
		//可以使用自定义connection_mananger，需实现ConnectionManager接口
		"connection_manager":"mssqlConnectionManager", 
		//是否使用数据库连接池，如果设置为true，则options选项需按照数据库产品的连接规则设置连接池相关属性，
		//此设置对mssql和sequelize无效，mssql仅支持连接池的连接方式。sequelzie由配置文件内部设置
		"use_pool":true,
		//数据库连接属性，请参考各数据库产品的连接设置方式
		"options":{
			"host":"localhost",
			"port":3306,
			"user":"your user",
			"password":"your password",
			"database":"your database",
			"connectionLimit":10
		},
		//事务设置，当存在该项时，noomi开启事务嵌套能力
		"transaction":{
			//事务实例名，如果不设置，则根据product自动生成，如果自定义事务，请继承Transaction接口
		  	"transaction":"mssqlTransaction",
			//隔离级, 针对sequelzie，如果为数据库，则执行数据库的隔离级 
			//取值: 1 read uncommited, 2 read commited, 3 repeatable read, 4 serializable
			"isolation_level":2,
			//方法表达式，符合表达式条件的方法会被设置为事务方法，调用时该方法涉及的数据库操作会加入事务执行，当出现异常时，会进行事务回滚
			//如下所示，如果实例名以service开头，其下所有方法都将作为事务方法
			"expressions":["service*.*"]
		}
	},
	//数据库配置，文件方式
	//"database":"database_mysql.json",
	//路由配置(可选配置)，如果采用注解方式设置路由，则不用配置
	"route":{
		//路由命名空间
		"namespace":"",
		//子文件，相对于app的configPath路径
		"files":["route/subroute.json"], 
		//路由配置
		"routes":[
			{
				//路径（通过浏览器访问的路径），字符串，必填，以/开头
				//如果路径最后为*，表示该实例下的方法匹配
				//如 /upload_*，则/upload_add表示调用uploadAction实例的add方法
				"path":"/upload",				
				//实例名，字符串，必填
				"instance_name":"uploadAction",	
				//方法，字符串，可选，当path中带
				"method":"upload", 
				//路由结果集，如果不填，则默认为json，方法return值（必须为json格式）将回写到请求端
				"results":[{
					//方法返回值，如果return 1，则调用该路由结果
					"value":1, 					
					//返回类型，字符串，可选值：redirect(重定向),chain(路由链),none(什么都不做),json(回写json到请求端)，默认json
					"type":"redirect",		
					//如果type为redirect和chain，则此项必填
					//为redirect，则为页面或路由路径，为chain时，必须为路由路径
					"url":"/user/showinfo",
					//参数列表，如果url为路由路径，则会从现路由对应的实例中取参数列表对应的属性并作为参数传递到下个路由
					"params":["userName"]
				},{
					//方法返回值，如果return 2，则调用该路由结果
					"value":2,
					"type":"chain",
					"url":"/user/last",
					"params":["type"]
				}]
			}
		]
	},
	//路由配置，文件方式
	// "route":"route.json",
	//aop配置，如果为注解方式，则不用配置
	"aop":{
		//子文件列表，表示可以加载的子aop文件
		"files":[], 
		//切点，可以配置多个
		"pointcuts":[{
			//切点id，必填，不可重复
			"id":"pointcut1",
			//表达式，必填，符合该表达式的方法会被拦截，可以采用通配符
			//如下，第一个表示拦截实例名为userService的getInfo方法
			//第二个表示拦截实例名以service开头的所有实例的所有方法（实例必须加入实例工厂，即用注解或在instance中配置）
			"expressions":["userService.getInfo","service*.*"]
		}],
		//切面，可以多个
		"aspects":[
			{
				//切面对应的实例名，必填
				"instance":"logAdvice",
				//通知，必填
				"advices":[
					{
						//通知对应的切点
						"pointcut_id":"pointcut1",	
						//通知类型，字符串，必填，取值范围:before(前置),after(后置),after-return(return),after-throw(抛出异常),around(环绕，即前后置)
						"type":"before",
						//切面对应实例的方法名，字符串，必填
						"method":"before"
					},{
						"pointcut_id":"pointcut1",
						"type":"after",
						"method":"after"
					},{
						"pointcut_id":"pointcut1",
						"type":"after-return",
						"method":"afterReturn"
					},{
						"pointcut_id":"pointcut1",
						"type":"after-throw",
						"method":"throw"
					},{
						"pointcut_id":"pointcut1",
						"type":"around",
						"method":"around"
					}	
				]
			}
		]
	},
	//过滤器配置
	"filter":{
		"filters":[
			{
				"instance_name":"pathFilter",   //实例名，必填
				"url_pattern":"/*",             //过滤url，支持通配符*，默认 "/*"
				"method_name":"do2"             //实例中的方法名，默认do
			} 
		]
	},
	//过滤器文件配置方式
	// "filter":"filter.json",
	//aop文件配置方式
	// "aop":"aop.json",
	//redis配置，当缓存、session、security采用存储方式为1时，必须设置
	//请参考npm redis中的redis设置
	"redis":[{
		"name":"default",
		"host":"localhost",
		"port":"6379"
	}],
	//redis文件配置方式
	// "redis":"redis.json",
	//安全框架配置，当需要使用noomi的安全框架时，需要配置
	"security":{
		"save_type":0,				//同session配置
		"max_size":10000000,		//同session配置
		"redis":"default",			//同session配置
		//过滤器针对的路由路径，如果不设置，则默为/*，表示拦截所有请求(只针对路由)
		//"expressions":["/*"], 
		//数据库相关设置
		"dboption":{
			//数据库连接设置，如果没有配置database，则此项必填，否则使用数据库配置中的数据库connection manager
			"conn_cfg":{
			    "user":"root",
			    "password":"field",
			    "host":"localhost",
			    "database":"codement"
			},
			//鉴权相关数据表名字映射，如果与默认值相同，则不用配置，数据表结构详情请参考安全管理器节
			"tables":{
				"groupAuthority":"t_group_authority", 		//组权限表名，默认t_group_authority
				"resource":"t_resource",					//资源表名，默认t_resource
				"resourceAuthority":"t_resource_authority"	//资源权限表名，默认t_resource_authority
			},
			//鉴权相关字段名映射，如果与默认值相同，则不用配置
			"columns":{
				"resourceId":"resource_id",					//资源id字段名，默认resource_id
				"authorityId":"authority_id",				//权限id字段名，默认authority_id
				"resourceUrl":"url",						//资源url字段名，默认url
				"groupId":"group_id"						//组id字段名，默认group_id
			}
		},
		"auth_fail_url":"/pages/error/403.html",			//鉴权失败页面路径，必填
		"login_url":"/pages/login.html"						//登录页面，必填
	},
	//安全框架，文件方式
	// "security":"security.json"
}
```

### <a id='附录2'>附录2-安全框架数据表sql</a>
示例代码为mysql数据库对应的sql，其它数据库请做相应修改。  
```sql
/*==============================================================*/
/* Table: t_authority                                           */
/*==============================================================*/
create table t_authority
(
   authority_id         int not null,
   authority            varchar(50) not null,
   primary key (authority_id)
);

/*==============================================================*/
/* Table: t_group                                               */
/*==============================================================*/
create table t_group
(
   group_id             int not null,
   group_name           varchar(50),
   remarks              varchar(200),
   primary key (group_id)
);

/*==============================================================*/
/* Table: t_group_authority                                     */
/*==============================================================*/
create table t_group_authority
(
   group_authority_id   int not null,
   authority_id         int not null,
   group_id             int,
   primary key (group_authority_id)
);

/*==============================================================*/
/* Table: t_group_user                                          */
/*==============================================================*/
create table t_group_user
(
   group_user_id        int not null,
   user_id              int,
   group_id             int,
   primary key (group_user_id)
);

/*==============================================================*/
/* Table: t_resource                                            */
/*==============================================================*/
create table t_resource
(
   resource_id          int not null,
   url                  varchar(500),
   title                varchar(50),
   primary key (resource_id)
);

/*==============================================================*/
/* Table: t_resource_authority                                  */
/*==============================================================*/
create table t_resource_authority
(
   resource_authority_id int not null,
   authority_id         int,
   resource_id          int,
   primary key (resource_authority_id)
);

/*==============================================================*/
/* Table: t_user                                                */
/*==============================================================*/
create table t_user
(
   user_id              int not null,
   user_name            varchar(50),
   user_pwd             varchar(32),
   enabled              smallint,
   primary key (user_id)
);

alter table t_group_authority add constraint FK_GROUPAUTH_REF_AUTH foreign key (authority_id)
      references t_authority (authority_id) on delete cascade on update cascade;

alter table t_group_authority add constraint FK_GROUP_AU_REF_GROUP foreign key (group_id)
      references t_group (group_id) on delete cascade on update cascade;

alter table t_group_user add constraint FK_GROUP_USER_REF_GROUP foreign key (group_id)
      references t_group (group_id) on delete cascade on update cascade;

alter table t_group_user add constraint FK_GROUP_USER_REF_USER foreign key (user_id)
      references t_user (user_id) on delete cascade on update cascade;

alter table t_resource_authority add constraint FK_RES_AUTH_REF_AUTH foreign key (authority_id)
      references t_authority (authority_id) on delete cascade on update cascade;

alter table t_resource_authority add constraint FK_RES_AUTH_REF_RES foreign key (resource_id)
      references t_resource (resource_id) on delete cascade on update cascade;
```

### <a id='集群Cluster'>附录3-集群 Cluster</a>

&emsp; &emsp;为提升cpu使用效率或多机并行，框架推荐使用pm2来进行多进程管理，实现性能监控、进程守护、负载均衡等功能。

&emsp; &emsp;在process.json中配置集群信息，更多参数配置参阅pm2官方文档

```js
{
    "apps" : [{      //数组，每个数组成员就是对应一个pm2中运行的应用
        "name"        : "noomi", // 项目名称
        "script"      : "build/test/app/app.js",  //入口文件
        "instances"   : "4",  //进程数
        "port"        : 3000,  //端口号
        "exec_mode"   : "cluster"  //应用程序启动模式，这里设置的是cluster_mode（集群），默认是fork
        //log_date_format: 日期时间格式化
        //error_file:自定义应用程序的错误日志文件
        //out_file:自定义应用程序日志文件
        //pid_file:自定义应用程序的pid文件
        //min_uptime:最小运行时间，这里设置的是60s即如果应用程序在60s内退出，pm2会认为程序异常退出，此时触发重启max_restarts设置数量
        //max_restarts:设置应用程序异常退出重启的次数，默认15次（从0开始计数）
        //cron_restart:定时启动，解决重启能解决的问题
        //watch:是否启用监控模式，默认是false。如果设置成true，当应用程序变动时，pm2会自动重载。这里也可以设置你要监控的文件。
        //exec_interpreter:应用程序的脚本类型，这里使用的shell，默认是nodejs
        //autorestart:启用/禁用应用程序崩溃或退出时自动重启
        //vizion:启用/禁用vizion特性(版本控制) 
    }]
}
```

**&emsp; &emsp;安装node-pm2之后，在控制台项目根路径输入pm2 start process.json 来启动多进程运行**

***注：框架在使用多进程运行时，需同时启动redis来配合实现缓存集群，即在页面缓存、会话、安全配置的存储类型都设置为saveType=1***


# 贡献者
1. 杨雷 email:fieldyang@163.com git:https://github.com/fieldyang
2. 唐榜 email:244750596@qq.com git:https://github.com/Tang1227















