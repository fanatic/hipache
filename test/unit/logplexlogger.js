(function () {
    /*globals describe:false, it:false, before:false*/
    'use strict';

    var expect = require('chai').expect;
    var SyslogLogger = require('../../lib/logplexlogger.js');
    var net = require('net');

    describe('Syslogger', function () {
        describe('#creation', function () {
            it('err with undefined path', function (done) {
                var logger = new SyslogLogger();
                logger.on('error', function (e) {
                    expect(e).to.be.instanceof(TypeError);
                    done();
                });
            });
        });

        describe('#legit logging', function () {
            var logFile = 'syslog://127.0.0.1:5514';

            var callback;
            var logger;

            before(function(){
                net.createServer(function(sock) {
                    sock.on('data', function(msg){
                        if (callback) {callback(msg);}
                    });
                }).listen(5514);
            });

            var clearUp = function () {
                if (logger) {
                    logger.stop();
                }
                logger = new SyslogLogger(logFile);
            };

            // XXX is that really what we want?
            it('empty data', function (done) {
                var data = {};
                var expectedLine = '<134>1 NaN-NaN-NaNTNaN:NaN:NaN.NaNZ+00:00 ' +
                        'hipache undefined router - at=info method= ' +
                        'path= host= fwd=\"\" container= connect= ' +
                        'service= status= bytes=\n';

                clearUp();
                logger.log(data);

                callback = function(msg){
                    expect(msg.toString()).to.eql(expectedLine);
                    done();
                };
            });

            it('legit data', function (done) {
                var data = {
                    fwdFor: '::1',
                    currentTime: 1392511390963,
                    totalTimeSpent: 11,
                    backendTimeSpent: 9,
                    method: 'GET',
                    url: '/',
                    httpVersion: '1.1',
                    statusCode: 200,
                    socketBytesWritten: 3236,
                    userAgent: 'curl/7.30.0',
                    hostHeader: 'mywebsite',
                    logplexToken: 't.12345',
                    backendName: 'web.1'
                };

                clearUp();
                logger.log(data);

                var expectedLine = '<134>1 2014-02-16T00:43:10.963Z+00:00 ' +
                  'hipache t.12345 router - at=info method=GET path=/ ' +
                  'host=mywebsite fwd=\"::1\" container=web.1 connect=2ms service=9ms ' +
                  'status=200 bytes=3236\n';

                callback = function(msg){
                    expect(msg.toString()).to.eql(expectedLine);
                    done();
                };
            });

            it('legit error data', function (done) {
                var data = {
                    fwdFor: '::1',
                    currentTime: 1392511390963,
                    backendTimeSpent: 30000,
                    method: 'GET',
                    url: '/',
                    httpVersion: '1.1',
                    statusCode: 503,
                    socketBytesWritten: 0,
                    userAgent: 'curl/7.30.0',
                    hostHeader: 'mywebsite',
                    logplexToken: 't.12345',
                    backendName: 'web.1',
                    errorCode: 'H12',
                    errorDesc: "Request timeout"
                };

                clearUp();
                logger.log(data);

                var expectedLine = '<134>1 2014-02-16T00:43:10.963Z+00:00 ' +
                  'hipache t.12345 router - at=info method=GET path=/ ' +
                  'host=mywebsite fwd=\"::1\" container=web.1 connect= service=30000ms ' +
                  'status=503 bytes=0\n';

                callback = function(msg){
                    expect(msg.toString()).to.eql(expectedLine);
                    done();
                };
            });

        });

    });

})();
