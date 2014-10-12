(function () {
    'use strict';

    var util = require('util'),
        EventEmitter = require('events').EventEmitter,
        url = require('url'),
        logger = require('./utils/syslog-tcp');

    var LogplexLogger = function (path) {
        var sayErr = (function (e) {
            process.nextTick(function () {
                this.emit('error', e);
            }.bind(this));
        }.bind(this));

        var start = this.start = function () {
            var syslogURL;
            try {
                syslogURL = url.parse(path);
                logger.setSyslogHost(syslogURL.hostname);
                logger.setPort(syslogURL.port);
            } catch(e) {
                sayErr(e);
            }
            logger.on('error', sayErr);
        };

        this.stop = function () {
            //noop
        };

        try {
            start();
        } catch (e) {
            sayErr(e);
        }


        this._send = function(prefix, data) {
            var line = prefix, date = new Date(data.currentTime);

            var connect = data.totalTimeSpent && data.backendTimeSpent ? 
                parseFloat(data.totalTimeSpent-data.backendTimeSpent)+'ms' : "";
            var service = data.backendTimeSpent ? 
                parseFloat(data.backendTimeSpent)+'ms' : "";
            var bytes = (data.socketBytesWritten === undefined) ?
                "" : parseInt(data.socketBytesWritten);

            line += ' method='+ (data.method || "");
            line += ' path='+   (data.url || "");
            line += ' host='+   (data.virtualHost || ""); //TODO: Really needs to be the full host!
            line += ' fwd="'+   (data.remoteAddr || "") +'"';
            line += ' container='+   (data.backendName || ""); //TODO: Need the concept of backend names
            line += ' connect='+ connect;
            line += ' service='+ service;
            line += ' status='+ (data.statusCode || "");
            line += ' bytes='+  bytes;

            //console.log("Writing stream:", line);
            logger.send(date, data.logplexToken, line + '\n');
        };

        var self = this;
        this.error = function (data) {
            // at=error code=H12 desc="Request timeout" method=GET path=/ 
            // host=myapp.herokuapp.com fwd="204.204.204.204" dyno=web.1
            // connect= service=30000ms status=503 bytes=0
            self._send('at=error code='+data.errorCode+' desc="'+data.errorDesc+'"', data);
        };

        this.log = function (data) {
            // at=info method=GET path=/ host=myapp.herokuapp.com fwd="204.204.204.204"
            // dyno=web.1 connect=1ms service=18ms status=200 bytes=13
            self._send('at=info', data);
        };
    };

    util.inherits(LogplexLogger, EventEmitter);

    module.exports = LogplexLogger;

})();
