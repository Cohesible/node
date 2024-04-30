'use strict';
const Readable = require('internal/streams/readable');
const kEmitMessage = Symbol('kEmitMessage');
class TestsStream extends Readable {
    #buffer;
    #canPush;
    constructor() {
        super({
            objectMode: true,
            highWaterMark: Number.MAX_SAFE_INTEGER
        });
        this.#buffer = [];
        this.#canPush = true;
    }
    _read() {
        this.#canPush = true;
        while (this.#buffer.length > 0) {
            const obj = this.#buffer.shift();
            if (!this.#tryPush(obj)) {
                return;
            }
        }
    }
    fail(nesting, loc, testNumber, name, details, directive) {
        this[kEmitMessage]('test:fail', {
            name,
            nesting,
            testNumber,
            details,
            ...loc,
            ...directive
        });
    }
    ok(nesting, loc, testNumber, name, details, directive) {
        this[kEmitMessage]('test:pass', {
            name,
            nesting,
            testNumber,
            details,
            ...loc,
            ...directive
        });
    }
    complete(nesting, loc, testNumber, name, details, directive) {
        this[kEmitMessage]('test:complete', {
            name,
            nesting,
            testNumber,
            details,
            ...loc,
            ...directive
        });
    }
    plan(nesting, loc, count) {
        this[kEmitMessage]('test:plan', {
            nesting,
            count,
            ...loc
        });
    }
    getSkip(reason = undefined) {
        return { skip: reason ?? true };
    }
    getTodo(reason = undefined) {
        return { todo: reason ?? true };
    }
    enqueue(nesting, loc, name) {
        this[kEmitMessage]('test:enqueue', {
            nesting,
            name,
            ...loc
        });
    }
    dequeue(nesting, loc, name) {
        this[kEmitMessage]('test:dequeue', {
            nesting,
            name,
            ...loc
        });
    }
    start(nesting, loc, name) {
        this[kEmitMessage]('test:start', {
            nesting,
            name,
            ...loc
        });
    }
    diagnostic(nesting, loc, message) {
        this[kEmitMessage]('test:diagnostic', {
            nesting,
            message,
            ...loc
        });
    }
    stderr(loc, message) {
        this[kEmitMessage]('test:stderr', { message, ...loc });
    }
    stdout(loc, message) {
        this[kEmitMessage]('test:stdout', { message, ...loc });
    }
    coverage(nesting, loc, summary) {
        this[kEmitMessage]('test:coverage', {
            nesting,
            summary,
            ...loc
        });
    }
    end() {
        this.#tryPush(null);
    }
    [kEmitMessage](type, data) {
        this.emit(type, data);
        // Disabling as this going to the user-land
        // eslint-disable-next-line node-core/set-proto-to-null-in-object
        this.#tryPush({ type, data });
    }
    #tryPush(message) {
        if (this.#canPush) {
            this.#canPush = this.push(message);
        }
        else {
            this.#buffer.push(message);
        }
        return this.#canPush;
    }
}
module.exports = { TestsStream, kEmitMessage };
