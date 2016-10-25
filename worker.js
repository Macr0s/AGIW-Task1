/**
 * Created by Macr0s on 24/10/16.
 */

var async = require("async");
var Worker = require("workerjs");
var config = require("./config.json");

var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' }
    ]
});

var logger = log4js.getLogger("worker " + process.pid);

var getXPath = function (url, xpath, cb){

    var worker = new Worker(__dirname + '/browserWorker.js', true);

    worker.addEventListener('message', function (msg) {
        cb(msg.data.status, msg.data.data);
        worker.terminate();
    });
    worker.postMessage({
        url: url,
        xpath: xpath
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
        getXPath(task.url, task.xpath, function (success, data){
            logger.info(success);
            if (data != null) {
                logger.info("Found xpath", data);
                process.send({
                    type: "update",
                    success: success,
                    task: task,
                    data: data
                })
            }else{
                logger.fatal("Not Forund xpath")
                process.send({
                    type: "update",
                    success: success,
                    task: task
                })
            }
            cb();
        });
    },config.browser);

    queue.drain = function (){
        process.send({
            type: "finished",
            pid: process.pid
        })
    }

    process.on('message', function(task) {
        queue.push(task, function (){
            logger.info("Completed", task.url, "for", task.attribute_name);
        })
    })
}


