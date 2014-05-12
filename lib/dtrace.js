// DTrace
var dtrace = require('dtrace-provider');
var dtraceProvider = dtrace.createDTraceProvider("mongoose");
exports.dtraceProvider = dtraceProvider;

var queryProbe = dtraceProvider.addProbe("query-start", "char *", "int");
var queryProbe = dtraceProvider.addProbe("query-done", "char *", "int");
dtraceProvider.enable();

var MAX_INT = Math.pow(2, 32) - 1;
var DTRACE_ID = 0;

exports.nextDTraceID = function() {
    if (++DTRACE_ID >= MAX_INT) {
                DTRACE_ID = 1;
    }

    return (DTRACE_ID);
};
