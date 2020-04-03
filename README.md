# smartTranslate
the program xml file auto translate 

系统语言支持中、英、繁体，每次系统新增词汇都需要手动去词汇配置文件进行维护，并且是同时维护三种语言，效率太低，有些开发人员甚至没有对词汇配置文件做词汇维护导致系统语言匹配混乱。

实现功能：
1、此程序通过百度翻译api实现自动翻译，开发只要在词汇xml配置文件配置对应的中文描述，剩余的繁体和英文程序自动进行添加
2、英文版可能是基于百度翻译存在偏差，如果有更专业的人需要进行英文翻译进行调整，可以指定excel格式（ID、中文、原英文、调整后英文），程序可自动将调整后的英文进行更新。
3、自动识别错误翻译，进行调整，程序批量查找很明显的词汇，并导出成文件，维护人员可手工进行调整。如果有规则可按规则批量处理词汇配置xml。

关于使用插件：
1、exceljs github doc：https://github.com/exceljs/exceljs
2、xml2js github doc：https://github.com/Leonidas-from-XIV/node-xml2js
3、百度翻译通用api，个人认证后高级版，文档地址：https://api.fanyi.baidu.com/doc/21
