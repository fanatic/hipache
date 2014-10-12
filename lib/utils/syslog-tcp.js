(function () {
  'use strict';

  /**
   * Custom version for Logplex from
   * github.com/andry1/ain-tcp
   */

  var Buffer = require('buffer').Buffer,
      events = require('events'),
      net = require('net'),
      util = require('util');

  function leadZero(n) {
    if (n < 10) {
        return '0' + n;
    } else {
        return n.toString();
    }
  }

  /**
   * Get current date in syslog format. Thanks https://github.com/kordless/lodge
   * @returns {String}
   */
  function getDate(ts) {
    var dt = ts || new Date();
    var hours = leadZero(dt.getUTCHours());
    var minutes = leadZero(dt.getUTCMinutes());
    var seconds = leadZero(dt.getUTCSeconds());
    var milliseconds = leadZero(dt.getUTCMilliseconds());
    var month = leadZero((dt.getUTCMonth() + 1));
    var day = leadZero(dt.getUTCDate());
    var year = dt.getUTCFullYear();
    return year+'-'+month+'-'+day+'T'+hours+':'+minutes+':'+seconds+'.'+milliseconds+'Z+00:00';
  }

  /**
   * Syslog logger
   * @constructor
   * @returns {SysLogger}
   */
  var SysLogger = function () {
    this._times = {};
    this._tcpConnection = null;
  };
  util.inherits(SysLogger, events.EventEmitter);

  /**
   * Setup our TCP connection to syslog, if appropriate
   */
  SysLogger.prototype._setupTCP = function(done) {
    var self = this;
    this._tcpConnection = net.createConnection(this.port, this.sysloghost)
      .on("error", function(exception) {
        self.emit("error", exception);
      })
      .on("close", function() {
        self._tcpConnection = null;
      })
      .on("connect", function() {
        done();
      });
  };

  SysLogger.prototype.setPort = function(port) {
    this.port = port || 514;
    return this;
  };

  SysLogger.prototype.setSyslogHost = function(sysloghost) {
    this.sysloghost = sysloghost || "localhost";
    return this;
  };

  SysLogger.prototype.send = function(ts, tag, message, done) {    
    var self = this;
    if(this._tcpConnection === null) {
      this._setupTCP(function() {
        self.send(ts, tag, message, done);
      });
      return;
    }
    var msg = new Buffer('<134>1 ' + getDate(ts) + ' hipache ' + tag + ' router - ' + message);

    if(message.charAt(message.length-1) !== '\n') { msg+='\n'; }
    this._tcpConnection.write(msg, undefined, 
      function(err) {
        if (err) {
          self.emit("error", 'Can\'t connect to '+this.sysloghost+':'+this.port + ':' + err);
        }
        if(done !== undefined) { done(err); }
    });
  };

  var logger = new SysLogger();
  module.exports = logger;    
})();