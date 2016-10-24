var cluster = require('cluster');

if (cluster.isWorker) {
    console.log('Worker ' + process.pid + ' has started.');
    require("./worker").load();
}


if (cluster.isMaster) {
    console.log('Master ' + process.pid + ' has started.');

    var main = require("./main");
    var workers = [];

    // Fork workers.
    for (var i = 0; i < 4; i++) {
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