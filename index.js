var cluster = require('cluster');
var config = require("./config.json");

if (cluster.isWorker) {
    console.log('Worker ' + process.pid + ' has started.');
    require("./worker").load();
}


if (cluster.isMaster) {
    console.log('Master ' + process.pid + ' has started.');

    var main = require("./main");
    var workers = [];

    // Fork workers.
    for (var i = 0; i < config.worker; i++) {
        var worker = cluster.fork();
        main.onWorker(worker);
        workers.push(worker);
    }

    main.load(workers)

    // Be notified when worker processes die.
    cluster.on('death', function(worker) {
        console.log('Worker ' + worker.pid + ' died.');
    });

}