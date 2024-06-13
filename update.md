
# Noomi

## 版本信息

### 1.0.0

1. 修复热部署在windows系统下的bug；
2. 修复ncache替换计算bug；
3. 删除route errorhandler配置项，替换方法，采用web后置处理；
4. 增加web后置处理，装饰器为@WebHandler，与filter相对应(webfilter在web请求处理前处理)，用法与filter相似，route异常处理可以在该环节处理；
5. 过滤器和后置处理，不再支持字符串，支持完整正则表达式；
6. 如果未设置实例名，实例名默认为类名，不再是首字母小写的驼峰命名方式。
7. 不再支持 实例、切面、路由、过滤器配置文件方式，统一采用注解（装饰器）方式；
8. 切点(pointcut)不再装饰方法，采用装饰属性，advice中直接使用装饰的属性名作为pointcutId。

### 1.0.0-beta7
1. 取消@DataType和@DataValidator装饰器，用@Prop装饰器代替
