'use strict';
const EventEmitter = require('events');
const { kEmptyObject } = require('internal/util');
module.exports = Worker;
// Common Worker implementation shared between the cluster primary and workers.
function Worker(options) {
    if (!(this instanceof Worker))
        return new Worker(options);
    Reflect.apply(EventEmitter, this, []);
    if (options === null || typeof options !== 'object')
        options = kEmptyObject;
    this.exitedAfterDisconnect = undefined;
    this.state = options.state || 'none';
    this.id = options.id | 0;
    if (options.process) {
        this.process = options.process;
        this.process.on('error', (code, signal) => this.emit('error', code, signal));
        this.process.on('message', (message, handle) => this.emit('message', message, handle));
    }
}
Object.setPrototypeOf(Worker.prototype, EventEmitter.prototype);
Object.setPrototypeOf(Worker, EventEmitter);
Worker.prototype.kill = function () {
    Reflect.apply(this.destroy, this, arguments);
};
Worker.prototype.send = function () {
    return Reflect.apply(this.process.send, this.process, arguments);
};
Worker.prototype.isDead = function () {
    return this.process.exitCode != null || this.process.signalCode != null;
};
Worker.prototype.isConnected = function () {
    return this.process.connected;
};
