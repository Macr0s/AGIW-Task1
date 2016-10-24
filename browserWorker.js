/**
 * Created by Macr0s on 24/10/16.
 */

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

            var node = result._value.nodes[0];
            var value = (typeof node != "undefined")?node._data:null;

            cb(browser.success, value);
        });

    });
};

self.onmessage = function (msg) {
    getXPath(msg.data.url, msg.data.xpath, function (status, data){
        self.postMessage({
            status: status,
            data: data
        })
    })
};

