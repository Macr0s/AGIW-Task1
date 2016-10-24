var xpath2css = require('xpath2css');
var CookieMap = require("cookiefile").CookieMap;
var async = require("async");
var tsv = require("tsv").TSV;
var fs = require("fs");
var sources = require("./sources.json");
var sizeof = require('object-sizeof');



var getXPath = function (url, xpath, cb){

    var Browser = require("zombie");

    browser = new Browser({
        userAgent: "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:40.0) Gecko/20100101 Firefox/40.1",
        referrer: "www.google.it"
    });
    console.log(browser.tabs.length)
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

            setTimeout(function (){
                cb(browser.success, result._value.nodes[0]);
            }, 3000);
        });

    });
};

var xpath = {};

var data = {};

var error = {}

var writeQueue = async.queue(function (task, cb){
    fs.writeFile(task.filename, JSON.stringify((task.obj == "xpath")?xpath:((task.obj == "data")?data:error), null, 4), function(err) {
        if(err) {
            console.log("file" + task.filename, err);
            return cb()
        }

        console.log("The file " + task.filename +" was saved!");
        cb()
    });
}, 1);

var writeJSON = function(obj, filename){
    writeQueue.push({
        obj: obj,
        filename: filename
    })
}

var publishResult = function (status, site, category, url, xpath, attribute_name, page_id, result){
    if (status && typeof result != "undefined"){
        if (typeof data[site]  == "undefined")
            data[site] = {};

        if (typeof data[site][category]  == "undefined")
            data[site][category] = [];

        var d = {};
        d[url] = result;

        data[site][category].push(d)
        writeJSON("data", "data.json");
    }else{
        if (typeof error[site]  == "undefined")
            error[site] = {};

        if (typeof error[site][category]  == "undefined")
            error[site][category] = [];

        error[site][category].push(url);
        writeJSON("error", "error.json")
    }
}

var queue = async.queue(function (task, cb){
    console.log("Analysing site", task.site);
    console.log("category", task.category);
    console.log("url", task.url);
    console.log("xpath", task.xpath);
    console.log("attribute_name", task.attribute_name);
    console.log("page_id", task.page_id);
    getXPath(task.url, task.xpath, function (success, node){
        console.log(success);
        if (typeof node != "undefined"){
            console.log("Found xpath", node._data);
            publishResult(success, task.site, task.category, task.url, task.xpath, task.attribute_name, task.page_id, node._data)
        }else{
            console.log("Not Forund xpath")
            publishResult(success, task.site, task.category, task.url, task.xpath, task.attribute_name, task.page_id)
        }
        cb();
    });
},1);

var rows = tsv.parse(fs.readFileSync("input.txt").toString("utf-8"));

console.log("Item loaded:", rows.length);

rows.forEach(function (row){
    var site = sources[row.SITO];

    if (typeof site == "undefined"){
        console.log("unable to find site:", row.SITO);
        return;
    }

    var category = site[row.CHIAVE];

    if (typeof category == "undefined"){
        console.log("unable to find category:", row.CHIAVE);
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

            console.log("Adding", url, "for", test.attribute_name);

            queue.push(task, function (){
                console.log("Completed", url, "for", test.attribute_name);
            })
        })
    });


});

sources = null;
rows = null;

writeJSON("xpath", "xpath.json")
