var util = require('util');
var net = require('net');
var events = require('events');
var crypto = require('crypto');

var oflib = require('oflib-node');

function OFProxy(controllerPort, controllerHost) {

                    function processMessage(id, by, msg) {
                        if ('error' in msg) {
                            self.emit('ofProxyError',
                                     {
                                        "id" : id,
                                        "at" : new Date(),
                                        "by" : by,
                                        "error" : msg.error
                                     });
                            return false;
                        } else {
                            var obj = {
                                    "id" : id,
                                    "at" : new Date(),
                                    "by" : by,
                                    "message" : msg.message
                                };
                            if ('warnings' in msg) {
                                obj.warnings = msg.warnigns;
                            }

                            self.emit('ofProxyMessage', obj);
                            return true;
                        }
                    };


            this.start = function start(proxyPort) {
                this.server.listen(proxyPort);
            };

            var self = this;

            this.server = net.createServer();

            this.server.on('connection', function(switchSocket) {

                try {
                    var id = crypto.randomBytes(16);
                } catch (ex) {
                    console.log('Crypto error: ' + ex);
                    var id = new Buffer(16);
                    id.write((new Date()).getTime().toString(), 0, 16);
                }

                var ended = false;

//                console.log("Switch connection from " + switchSocket.remoteAddress + ":" + switchSocket.remotePort +
//                            " id: " + id.toString('hex') + ".");

                self.emit('ofProxySessionStart',
                             {
                                "id" : id,
                                "at" : new Date(),
                                "address" : switchSocket.remoteAddress,
                                "port" : switchSocket.remotePort
                             });


                var controllerSocket = new net.Socket();
                controllerSocket.connect(controllerPort, controllerHost);

                var controllerConnected = false;
                var switchBuffers = [];

                controllerSocket.on('connect', function() {
//                    console.log("Controller connection for id: " + id.toString('hex') + ".");

                    switchBuffers.forEach(function(data) {
                        if (!controllerSocket.write(data)) {
                            console.log("Controller write false for id: " + id.toString('hex') + '.');
                        }
                        var msgs = switchStream.process(data);
                        msgs.forEach(function(msg) {
                            if (!processMessage.call(this, id, "switch", msg)) {
                                console.log("Switch processMessage false for id: " + id.toString('hex') + '.');
                                console.log("Message was: %j.", msg);
                                switchSocket.end();
                                controllerSocket.end();
                            }
                        });
                    });
                    controllerConnected = true;
                    switchBuffers = [];
                });

                var switchStream = new oflib.Stream();
                var controllerStream = new oflib.Stream();

                switchSocket.on('data', function(data) {
//                    console.log("Switch data (" + data.length + ") for id: " + id.toString('hex') + '.');

                    if (controllerConnected && !ended) {
                        if (!controllerSocket.write(data)) {
                            console.log("Controller write false for id: " + id.toString('hex') + '.');
                        }

                        var msgs = switchStream.process(data);
                        msgs.forEach(function(msg) {
                            if (!processMessage.call(this, id, "switch", msg)) {
                                console.log("Switch processMessage false for id: " + id.toString('hex') + '.');
                                console.log("Message was: %j.", msg);
                                switchSocket.end();
                                controllerSocket.end();
                            }
                        });
                    } else {
                        switchBuffers.push(data);
                    }

                });

                controllerSocket.on('data', function(data) {
                    if (!ended) {
                        if (!switchSocket.write(data)) {
                            console.log("Switch write false for id: " + id.toString('hex') + '.');
                        }

                        var msgs = controllerStream.process(data);
                        msgs.forEach(function(msg) {
                            if (!processMessage.call(this, id, "controller", msg)) {
                                console.log("Controller processMessage false for id: " + id.toString('hex') + '.');
                                console.log("Message was: %j.", msg);
                                switchSocket.end();
                                controllerSocket.end();
                            }
                        });
                    }
                });

                switchSocket.on('error', function(exception) {
                    console.log("Switch exception (" + exception + ") for id: " + id.toString('hex') + '.');
                });

                controllerSocket.on('error', function(exception) {
                    console.log("Controller exception (" + exception + ") for id: " + id.toString('hex') + '.');
                });

                switchSocket.on('end', function() {
                    console.log("Switch end for id: " + id.toString('hex') + '.');
                });

                controllerSocket.on('end', function() {
                    console.log("Controller end for id: " + id.toString('hex') + '.');
                });

                switchSocket.on('close', function() {
                    console.log("Switch close for id: " + id.toString('hex') + '.');

                    if (!ended) {
                        ended = true;
                        self.emit('ofProxySessionEnd',
                                 {
                                    "id" : id,
                                    "at" : new Date(),
                                    "by" : "switch"
                                });
                    }
                    controllerSocket.end();
                });

                controllerSocket.on('close', function() {
                    console.log("Controller close for id: " + id.toString('hex') + '.');

                    if (!ended) {
                        ended = true;
                        self.emit('ofProxySessionEnd',
                                 {
                                    "id" : id,
                                    "at" : new Date(),
                                    "by" : "controller"
                                });
                    }
                    controllerSocket.end();
                });
        });
};

OFProxy.prototype = new events.EventEmitter();

module.exports = OFProxy;