/**
 * Created by Macr0s on 24/10/16.
 */

var async = require("async");


var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' }
    ]
});


var logger = log4js.getLogger("worker " + process.pid);


var getXPath = function (url, xpath, cb){

    var Browser = require("zombie");

    var browser = new Browser({
        userAgent: "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1",
        referrer: "www.google.it"
    });
    browser.visit(url, function () {

        if (!browser.success){
            setTimeout(function (){
                cb(browser.success);
            }, 3000);
            return;
        }

        browser.wait(function() {
            // jquery is ready
            var result = browser.evaluate("document.evaluate('"+xpath+"', document, null, XPathResult.ANY_TYPE, null )");

            cb(browser.success, result._value.nodes[0]);
        });

    });
};

module.exports.load = function (){
    var queue = async.queue(function (task, cb){
        logger.info("Analysing site", task.site);
        logger.log("category", task.category);
        logger.log("url", task.url);
        logger.log("xpath", task.xpath);
        logger.log("attribute_name", task.attribute_name);
        logger.log("page_id", task.page_id);
        getXPath(task.url, task.xpath, function (success, node){
            logger.info(success);
            if (typeof node != "undefined") {
                logger.info("Found xpath", node._data);
                process.send({
                    success: success,
                    task: task,
                    data: node._data
                })
            }else{
                logger.fatal("Not Forund xpath")
                process.send({
                    success: success,
                    task: task
                })
            }
            cb();
        });
    },1);


    process.on('message', function(task) {
        queue.push(task, function (){
            logger.info("Completed", task.url, "for", task.attribute_name);
        })
    })
}


