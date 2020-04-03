var http=require("http"); 
var request = require('request');
const fs=require('fs');
var xml2js= require("xml2js");

/**
* 使用百度翻译通用api，个人认证后高级版
* 文档地址：https://api.fanyi.baidu.com/doc/21
* 说明：必须联网，有ip白名单限制，注册号账户后可进行本机或服务器ip设置，只有白名单的ip才能够发起api请求。
* 百度翻译api免费版高级版有对QPS（每秒查询率）=10的上限限制，所以做个定时器减少并发率
**/
const appid = '20200402000XXXX';//百度开发者注册后获取
const key = 'ERoVtyyLDu44iSXXXXX';
const salt = (new Date).getTime();

const unNormalEn="0l0";
const xmlPath="./upload/resource.xml";//存量xml文件 
var ws = fs.createWriteStream('./upload/resource_en.xml');//生成新的调整后xml文件
var putOutData;//全局输出的xml临时对象



http.createServer(function(req,response){
	response.setHeader("Content-Type","text/html;charset=UTF-8"); 
	response.writeHead(200, {'Content-Type': 'application/xml'});
	
	/** 翻译单个单词测试示例
		baiduTranslateApiReq("我爱你中国，我伟大的祖国！","zh","en",function(error,data){
			if(data){
				console.log(JSON.stringify(data));
				console.log(JSON.parse(data).trans_result[0].dst);
			}
			if(error){
				console.log(JSON.stringify(error));
			}
		});
	**/
	
	/** 实现逻辑：
	*	1、获取xml所有节点
	*	2、如果id为“en_US”,且为空，发接口翻译，同理如果繁体为空也要发接口补充
	*	3、如果没有“en_US”,新建一个xml节点（需要找到xml2js方法），同理如果没有繁体也要新建
	**/
	var tempNum=0;
	var tempCN="";
	fs.readFile(xmlPath, function(err, data) {
		var parser = new xml2js.Parser({"explicitArray":true,"async":true});//explicitArray 转化为数组
		parser.parseString(data, function (err, result){ 
			putOutData=result;
			enStranslateLoop(0,function(error,data){
				if(data){
					var builder = new xml2js.Builder();
					var xml = builder.buildObject(putOutData);
					ws.write(xml, "UTF-8"); //需要根据resource xml的encoding语言保持一致
					ws.end();
				}
			});
		});
	});
}).listen(8889);//配置端口

//批量循环处理的变量，做全局声明，否则重复声明变量导致变量太多最终导致内存溢出的情况，保证一个变量内部控制好赋值取值范围就好
var tempStatus=0;//是否有英文，0-有，1-没有
var tempResourceValueObj;
var tempCN="";
var tempLog="";//打印日志，保存异常日志文件
var tempRecord=0;//记录修改次数
var tempUpdateID="";//记录修改id，后面打印出来或者导出来文件记录
var currentJ=1;

/** 循环翻译
* index，当前节点
* callback,回调函数含error,data
**/
var enStranslateLoop=function(index,callback){//用递归调用，避免发baidu api http请求异步导致数据不一致,并以回调函数形式返回结果
 try{
		if(index<putOutData.IDEExternResource.resource.length){ 
			tempResourceValueObj=putOutData.IDEExternResource.resource[index].resourceValue;
			for(var j=0;j<tempResourceValueObj.length;j++){
				if(tempResourceValueObj[j].$.id=="zh_CN"&&tempResourceValueObj[j]._!=null){
					tempCN=tempResourceValueObj[j]._;
				}
				if(tempResourceValueObj[j].$.id=="en_US"&&tempResourceValueObj[j]._==null){//xml如果节点值为空可通过undefined和null判断，""无效
					tempStatus=1;
					currentJ=j;
				}
				//如果英文版有固定的特殊字符，也要进行过滤重新翻译
			}
			if(tempCN!=""&&tempStatus==1){
				//百度翻译api免费版高级版有对QPS（每秒查询率）=10的上限限制，所以做个定时器减少并发率
				setTimeout(function(){ 
					baiduTranslateApiReq(tempCN,"zh","en",function(error,data){
						if(data){
							tempRecord++;
							tempUpdateID += putOutData.IDEExternResource.resource[index].$.id+","; 
							console.log(JSON.stringify(data));
							putOutData.IDEExternResource.resource[index].resourceValue[currentJ]._=JSON.parse(data).trans_result[0].dst;
							tempStatus=0;
							index++;
							enStranslateLoop(index,callback);
						}
						if(error){
							console.log(JSON.stringify(error));
						}
					});
				},125);//1秒最多能请求10次正常是隔100毫秒，那控制1秒最多请将8次，每隔125毫秒就不会超出api QPS的限制。
			}else{
				index++;
				enStranslateLoop(index,callback);
			}
		}else{
			console.log("updated resource id list:"+tempUpdateID);
			console.log("the count of en_US value is null:"+tempRecord+". updated success");
			callback("failed","success");
		}
	}catch(e){
		console.log(JSON.stringify(e));
	}
}
/** 百度翻译api
* query,多个query可以用\n连接  如 query='apple\norange\nbanana\npear'，最长为2000个字符
* from,源语言，繁体中文：cht,源语言语种不确定时可设置为 auto
* to,目标语言，目标语言语种不可设置为 auto
**/
var baiduTranslateApiReq=function(query,from,to,callback){
	var str1 = appid + query + salt +key;
	var sign = MD5(str1);
	request({
		  		//timeout:5000,
		   		method:'GET',
     			url:'http://api.fanyi.baidu.com/api/trans/vip/translate',
     			qs:{
     				q: query,
					appid: appid,
					salt: salt,
					from: from,
					to: to,
					sign: sign
     			}
		   	},function (error, response, body) {
		        if (!error && response.statusCode == 200) {
		        	callback(null,body);
		        }else{
					callback(error,null);
		        }
		    });
}

/** 百度JavaScript sdk MD5签名
* string ,签名字符串
**/
var MD5 = function (string) {
  
    function RotateLeft(lValue, iShiftBits) {
        return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
    }
  
    function AddUnsigned(lX,lY) {
        var lX4,lY4,lX8,lY8,lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }
  
    function F(x,y,z) { return (x & y) | ((~x) & z); }
    function G(x,y,z) { return (x & z) | (y & (~z)); }
    function H(x,y,z) { return (x ^ y ^ z); }
    function I(x,y,z) { return (y ^ (x | (~z))); }
  
    function FF(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
  
    function GG(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
  
    function HH(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
  
    function II(a,b,c,d,x,s,ac) {
        a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
        return AddUnsigned(RotateLeft(a, s), b);
    };
  
    function ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1=lMessageLength + 8;
        var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
        var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
        var lWordArray=Array(lNumberOfWords-1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while ( lByteCount < lMessageLength ) {
            lWordCount = (lByteCount-(lByteCount % 4))/4;
            lBytePosition = (lByteCount % 4)*8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount-(lByteCount % 4))/4;
        lBytePosition = (lByteCount % 4)*8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
        lWordArray[lNumberOfWords-2] = lMessageLength<<3;
        lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
        return lWordArray;
    };
  
    function WordToHex(lValue) {
        var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
        for (lCount = 0;lCount<=3;lCount++) {
            lByte = (lValue>>>(lCount*8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
        }
        return WordToHexValue;
    };
  
    function Utf8Encode(string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";
  
        for (var n = 0; n < string.length; n++) {
  
            var c = string.charCodeAt(n);
  
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
  
        }
  
        return utftext;
    };
  
    var x=Array();
    var k,AA,BB,CC,DD,a,b,c,d;
    var S11=7, S12=12, S13=17, S14=22;
    var S21=5, S22=9 , S23=14, S24=20;
    var S31=4, S32=11, S33=16, S34=23;
    var S41=6, S42=10, S43=15, S44=21;
  
    string = Utf8Encode(string);
  
    x = ConvertToWordArray(string);
  
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
  
    for (k=0;k<x.length;k+=16) {
        AA=a; BB=b; CC=c; DD=d;
        a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
        d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
        c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
        b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
        a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
        d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
        c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
        b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
        a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
        d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
        c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
        b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
        a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
        d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
        c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
        b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
        a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
        d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
        c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
        b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
        a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
        d=GG(d,a,b,c,x[k+10],S22,0x2441453);
        c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
        b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
        a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
        d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
        c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
        b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
        a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
        d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
        c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
        b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
        a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
        d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
        c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
        b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
        a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
        d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
        c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
        b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
        a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
        d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
        c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
        b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
        a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
        d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
        c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
        b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
        a=II(a,b,c,d,x[k+0], S41,0xF4292244);
        d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
        c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
        b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
        a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
        d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
        c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
        b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
        a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
        d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
        c=II(c,d,a,b,x[k+6], S43,0xA3014314);
        b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
        a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
        d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
        c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
        b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
        a=AddUnsigned(a,AA);
        b=AddUnsigned(b,BB);
        c=AddUnsigned(c,CC);
        d=AddUnsigned(d,DD);
    }
  
    var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);
  
    return temp.toLowerCase();
}

console.log("localhost:8889","server is running");
