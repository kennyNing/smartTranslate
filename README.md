# smartTranslate
the program xml file auto translate 

系统语言支持中、英、繁体，每次系统新增词汇都需要手动去xml配置文件进行维护，并且是同时维护三种语言，太难了。

smartTranslate实现功能：
1、通过百度翻译api实现自动翻译，开发只要在词汇xml配置文件配置对应的中文描述，剩余的繁体和英文程序自动进行添加。
2、英文版可能是基于百度翻译存在偏差，业务按指定excel格式（ID、中文、原英文、调整后英文），程序可自动将调整后的英文对xml进行更新。
3、根据中文自动生成英文翻译节点。
4、根据中文自动生成繁体字xml节点。
5、如果英文和繁体为空，只有中文的，自动生成对应英文和繁体节点。

关于使用插件：
1、exceljs github doc：https://github.com/exceljs/exceljs
2、xml2js github doc：https://github.com/Leonidas-from-XIV/node-xml2js
3、百度翻译通用api，个人认证后高级版，文档地址：https://api.fanyi.baidu.com/doc/21
