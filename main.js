/**
 * Created by Macr0s on 24/10/16.
 */

var async = require("async");
var tsv = require("tsv").TSV;
var fs = require("fs");
var config = require("./config.json");
var sources = require(config.sources);

var log4js = require('log4js');
log4js.configure({
    appenders: [
        { type: 'console' }
    ]
});


var logger = log4js.getLogger("main");

var xpath = {};

var data = {};

var error = {}

var publishResult = function (status, site, category, url, xpath, attribute_name, page_id, result){
    if (status && typeof result != "undefined"){
        if (typeof data[site]  == "undefined")
            data[site] = {};

        if (typeof data[site][category]  == "undefined")
            data[site][category] = {};

        if (typeof data[site][category][attribute_name]  == "undefined")
            data[site][category][attribute_name] = [];

        var d = {};
        d[url] = result.trim();


        data[site][category][attribute_name].push(d);
        writeJSON("data", config.data);
    }else{
        if (typeof error[site]  == "undefined")
            error[site] = {};

        if (typeof error[site][category]  == "undefined")
            error[site][category] = [];

        error[site][category].push(url);
        writeJSON("error", config.error);
    }
}

var accessQueue = async.queue(function (task, cb){
    if (task.type == "update"){
        var msg = task.msg;
        if (msg.success){
            publishResult(
                msg.success,
                msg.task.site,
                msg.task.category,
                msg.task.url,
                msg.task.xpath,
                msg.task.attribute_name,
                msg.task.page_id,
                msg.data)
        }else{
            publishResult(
                msg.success,
                msg.task.site,
                msg.task.category,
                msg.task.url,
                msg.task.xpath,
                msg.task.attribute_name,
                msg.task.page_id)
        }

        cb()
    }else{
        fs.writeFile(task.filename, JSON.stringify(task.obj, null, 4), function(err) {
            if(err) {
                logger.info("file" + task.filename, err);
                return cb()
            }

            logger.info("The file " + task.filename +" was saved!");
            cb()
        });
    }
}, 1);

var writeJSON = function(obj, filename){
    accessQueue.push({
        type: "write",
        obj: (obj == "xpath")?xpath:((obj == "data")?data:error),
        filename: filename
    })
}

var worker_alive= 0;

accessQueue.drain = function (){
    if (worker_alive == 0)
        process.exit();
}

module.exports = {
    onWorker: function (worker){
        worker.on('message', function(msg) {
            if (msg.type == "update")
                accessQueue.push({
                    type: "update",
                    msg: msg
                })
            else if(msg.type == "finished"){
                logger.info("Worker "+ msg.pid + " finished")
                worker_alive -= 1;
                console.log(worker_alive)
                if (worker_alive == 0){
                    logger.info("All task done!!");

                    if (accessQueue.length == 0)
                        process.exit();
                }
            }
        });
    },
    load: function (workers){
        worker_alive = workers.length
        var rows = tsv.parse(fs.readFileSync(config.input).toString("utf-8"));
        logger.info("Item loaded:", rows.length);

        rows.forEach(function (row){
            var site = sources[row.SITO];

            if (typeof site == "undefined"){
                logger.info("unable to find site:", row.SITO);
                return;
            }

            var category = site[row.CHIAVE];

            if (typeof category == "undefined"){
                logger.info("unable to find category:", row.CHIAVE);
                return;
            }

            var tests = [];

            function getTests(path, label, page_id){
                if (typeof row[path] != "undefined"){
                    tests.push({
                        xpath: row[path],
                        attribute_name: row[label],
                        page_id: row[page_id] == "1"
                    })
                }
            }

            getTests("PATH", "LABEL", "PAGE_ID");
            getTests("PATH_2", "LABEL_2", "PAGE_ID_2");
            getTests("PATH_3", "LABEL_3", "PAGE_ID_3");
            getTests("PATH_4", "LABEL_4", "PAGE_ID_4");
            getTests("PATH_5", "LABEL_5", "PAGE_ID_5");
            getTests("PATH_6", "LABEL_6", "PAGE_ID_6");

            tests.forEach(function (test){
                if (typeof xpath[row.SITO]  == "undefined")
                    xpath[row.SITO] = {};

                if (typeof xpath[row.SITO][row.CHIAVE]  == "undefined")
                    xpath[row.SITO][row.CHIAVE] = [];

                xpath[row.SITO][row.CHIAVE].push({
                    rule: test.xpath,
                    attribute_name: test.attribute_name,
                    page_id: test.page_id
                })

                category.forEach(function (url){
                    var task = {
                        site: row.SITO,
                        category: row.CHIAVE,
                        url: url,
                        xpath: test.xpath,
                        attribute_name: test.attribute_name,
                        page_id: test.page_id
                    };

                    logger.info("Adding", url, "for", test.attribute_name);

                    var worker = workers[Math.floor(Math.random()*workers.length)];
                    worker.send(task)
                })
            });

        });

        writeJSON("xpath", config.xpath);
    }
}