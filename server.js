var http=require("http"); 
var excel = require('exceljs'); //github doc：https://github.com/exceljs/exceljs
var xml2js= require("xml2js"); //github doc：https://github.com/Leonidas-from-XIV/node-xml2js
const fs=require('fs');

const excelPath="./upload/data.xlsx";//需英文调整表格，默认第4列为要求调整列
const xmlPath="./upload/resource.xml";//存量xml文件
var ws = fs.createWriteStream('./upload/resource_new.xml');//生成新的调整后xml文件

http.createServer(function(request,response){
	response.setHeader("Content-Type","text/html;charset=UTF-8"); 
	response.writeHead(200, {'Content-Type': 'application/xml'});
	
	var putOutData;
	fs.readFile(xmlPath, function(err, data) {
		var parser = new xml2js.Parser({"explicitArray":true,"async":true});//explicitArray 转化为数组
		parser.parseString(data, function (err, result){//貌似插件还不支持设置同步，默认为异步处理，文件太大会导致处理延迟，所以业务处理在这个方法体内完成,或者用同步方法实现
			putOutData=result;
			var workbook = new excel.Workbook();
			workbook.xlsx.readFile(excelPath).then(function() {
			    var worksheet = workbook.getWorksheet(1); //获取翻译表格的第一个worksheet
				console.log("excel total row count："+worksheet.rowCount);
				worksheet.eachRow(function(row, rowNumber) {//循环行，每行对应的单元格值值获取方法：row.getCell(1).value，下标从1开始
					for(var i=0;i< putOutData.IDEExternResource.resource.length;i++ ){//循环每一个resource对象
						if(putOutData.IDEExternResource.resource[i].resourceValue.length==1){//只有一行中文的跳出
							continue;
						}
						if(putOutData.IDEExternResource.resource[i].resourceValue.length>=2&&row.getCell(4).value!=""&&row.getCell(4).value!=null){//必须含有第2个en_US对象,且翻译调整后英文列不为空							
							if(row.getCell(1).value==putOutData.IDEExternResource.resource[i].$.id){//resourceID一致
								//根据id为en_US的进行更新,有可能en_US顺序不是在中间
								for(var j=0;j<putOutData.IDEExternResource.resource[i].resourceValue.length;j++){
									if(putOutData.IDEExternResource.resource[i].resourceValue[j].$.id=="en_US"){
										//将调整后的英文在xml中对en进行更新
										putOutData.IDEExternResource.resource[i].resourceValue[j]._=row.getCell(4).value;
									}
								}
							}
						}
					}
					if(rowNumber==worksheet.rowCount){//避免处理先后异步问题
						var builder = new xml2js.Builder();
						var xml = builder.buildObject(putOutData);
						ws.write(xml, "UTF-8"); //需要根据resource xml的encoding语言保持一致
						ws.end();
						console.log("finished");
					}
				});
			});
		});
	});
}).listen(8888);//配置端口

console.log("localhost:8888","server is running");
