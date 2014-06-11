// DTrace
var dtrace = require('dtrace-provider');

var MAX_INT = Math.pow(2, 32) - 1;
var DTRACE_ID = 0;
exports.enabled = false;

exports.nextDTraceID = function() {
    if (++DTRACE_ID >= MAX_INT) {
                DTRACE_ID = 1;
    }

    return (DTRACE_ID);
};


exports.init = function() {
    var dtraceProvider = dtrace.createDTraceProvider("mongoose");
    exports.dtraceProvider = dtraceProvider;

    dtraceProvider.addProbe("query-start","char *", "char *", "int");
    dtraceProvider.addProbe("query-done", "char *", "char *", "int");
    dtraceProvider.enable();
    exports.enabled = true;
}

