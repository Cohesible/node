'use strict';
const { codes: { ERR_INVALID_ARG_TYPE, }, } = require('internal/errors');
const { validateFunction, } = require('internal/validators');
const { triggerUncaughtException } = internalBinding('errors');
const { WeakReference } = require('internal/util');
// Can't delete when weakref count reaches 0 as it could increment again.
// Only GC can be used as a valid time to clean up the channels map.
class WeakRefMap extends Map {
    #finalizers = new FinalizationRegistry((key) => {
        this.delete(key);
    });
    set(key, value) {
        this.#finalizers.register(value, key);
        return super.set(key, new WeakReference(value));
    }
    get(key) {
        return super.get(key)?.get();
    }
    incRef(key) {
        return super.get(key)?.incRef();
    }
    decRef(key) {
        return super.get(key)?.decRef();
    }
}
function markActive(channel) {
    // eslint-disable-next-line no-use-before-define
    Object.setPrototypeOf(channel, ActiveChannel.prototype);
    channel._subscribers = [];
    channel._stores = new Map();
}
function maybeMarkInactive(channel) {
    // When there are no more active subscribers or bound, restore to fast prototype.
    if (!channel._subscribers.length && !channel._stores.size) {
        // eslint-disable-next-line no-use-before-define
        Object.setPrototypeOf(channel, Channel.prototype);
        channel._subscribers = undefined;
        channel._stores = undefined;
    }
}
function defaultTransform(data) {
    return data;
}
function wrapStoreRun(store, data, next, transform = defaultTransform) {
    return () => {
        let context;
        try {
            context = transform(data);
        }
        catch (err) {
            process.nextTick(() => {
                triggerUncaughtException(err, false);
            });
            return next();
        }
        return store.run(context, next);
    };
}
// TODO(qard): should there be a C++ channel interface?
class ActiveChannel {
    subscribe(subscription) {
        validateFunction(subscription, 'subscription');
        this._subscribers.push(subscription);
        channels.incRef(this.name);
    }
    unsubscribe(subscription) {
        const index = this._subscribers.indexOf(subscription);
        if (index === -1)
            return false;
        this._subscribers.splice(index, 1);
        channels.decRef(this.name);
        maybeMarkInactive(this);
        return true;
    }
    bindStore(store, transform) {
        const replacing = this._stores.has(store);
        if (!replacing)
            channels.incRef(this.name);
        this._stores.set(store, transform);
    }
    unbindStore(store) {
        if (!this._stores.has(store)) {
            return false;
        }
        this._stores.delete(store);
        channels.decRef(this.name);
        maybeMarkInactive(this);
        return true;
    }
    get hasSubscribers() {
        return true;
    }
    publish(data) {
        for (let i = 0; i < (this._subscribers?.length || 0); i++) {
            try {
                const onMessage = this._subscribers[i];
                onMessage(data, this.name);
            }
            catch (err) {
                process.nextTick(() => {
                    triggerUncaughtException(err, false);
                });
            }
        }
    }
    runStores(data, fn, thisArg, ...args) {
        let run = () => {
            this.publish(data);
            return Reflect.apply(fn, thisArg, args);
        };
        for (const entry of this._stores.entries()) {
            const store = entry[0];
            const transform = entry[1];
            run = wrapStoreRun(store, data, run, transform);
        }
        return run();
    }
}
class Channel {
    constructor(name) {
        this._subscribers = undefined;
        this._stores = undefined;
        this.name = name;
        channels.set(name, this);
    }
    static [Symbol.hasInstance](instance) {
        const prototype = Object.getPrototypeOf(instance);
        return prototype === Channel.prototype ||
            prototype === ActiveChannel.prototype;
    }
    subscribe(subscription) {
        markActive(this);
        this.subscribe(subscription);
    }
    unsubscribe() {
        return false;
    }
    bindStore(store, transform) {
        markActive(this);
        this.bindStore(store, transform);
    }
    unbindStore() {
        return false;
    }
    get hasSubscribers() {
        return false;
    }
    publish() { }
    runStores(data, fn, thisArg, ...args) {
        return Reflect.apply(fn, thisArg, args);
    }
}
const channels = new WeakRefMap();
function channel(name) {
    const channel = channels.get(name);
    if (channel)
        return channel;
    if (typeof name !== 'string' && typeof name !== 'symbol') {
        throw new ERR_INVALID_ARG_TYPE('channel', ['string', 'symbol'], name);
    }
    return new Channel(name);
}
function subscribe(name, subscription) {
    return channel(name).subscribe(subscription);
}
function unsubscribe(name, subscription) {
    return channel(name).unsubscribe(subscription);
}
function hasSubscribers(name) {
    const channel = channels.get(name);
    if (!channel)
        return false;
    return channel.hasSubscribers;
}
const traceEvents = [
    'start',
    'end',
    'asyncStart',
    'asyncEnd',
    'error',
];
function assertChannel(value, name) {
    if (!(value instanceof Channel)) {
        throw new ERR_INVALID_ARG_TYPE(name, ['Channel'], value);
    }
}
function tracingChannelFrom(nameOrChannels, name) {
    if (typeof nameOrChannels === 'string') {
        return channel(`tracing:${nameOrChannels}:${name}`);
    }
    if (typeof nameOrChannels === 'object' && nameOrChannels !== null) {
        const channel = nameOrChannels[name];
        assertChannel(channel, `nameOrChannels.${name}`);
        return channel;
    }
    throw new ERR_INVALID_ARG_TYPE('nameOrChannels', ['string', 'object', 'TracingChannel'], nameOrChannels);
}
class TracingChannel {
    constructor(nameOrChannels) {
        for (const eventName of traceEvents) {
            Object.defineProperty(this, eventName, {
                value: tracingChannelFrom(nameOrChannels, eventName)
            });
        }
    }
    get hasSubscribers() {
        return this.start.hasSubscribers ||
            this.end.hasSubscribers ||
            this.asyncStart.hasSubscribers ||
            this.asyncEnd.hasSubscribers ||
            this.error.hasSubscribers;
    }
    subscribe(handlers) {
        for (const name of traceEvents) {
            if (!handlers[name])
                continue;
            this[name]?.subscribe(handlers[name]);
        }
    }
    unsubscribe(handlers) {
        let done = true;
        for (const name of traceEvents) {
            if (!handlers[name])
                continue;
            if (!this[name]?.unsubscribe(handlers[name])) {
                done = false;
            }
        }
        return done;
    }
    traceSync(fn, context = {}, thisArg, ...args) {
        if (!this.hasSubscribers) {
            return Reflect.apply(fn, thisArg, args);
        }
        const { start, end, error } = this;
        return start.runStores(context, () => {
            try {
                const result = Reflect.apply(fn, thisArg, args);
                context.result = result;
                return result;
            }
            catch (err) {
                context.error = err;
                error.publish(context);
                throw err;
            }
            finally {
                end.publish(context);
            }
        });
    }
    tracePromise(fn, context = {}, thisArg, ...args) {
        if (!this.hasSubscribers) {
            return Reflect.apply(fn, thisArg, args);
        }
        const { start, end, asyncStart, asyncEnd, error } = this;
        function reject(err) {
            context.error = err;
            error.publish(context);
            asyncStart.publish(context);
            // TODO: Is there a way to have asyncEnd _after_ the continuation?
            asyncEnd.publish(context);
            return Promise.reject(err);
        }
        function resolve(result) {
            context.result = result;
            asyncStart.publish(context);
            // TODO: Is there a way to have asyncEnd _after_ the continuation?
            asyncEnd.publish(context);
            return result;
        }
        return start.runStores(context, () => {
            try {
                let promise = Reflect.apply(fn, thisArg, args);
                // Convert thenables to native promises
                if (!(promise instanceof Promise)) {
                    promise = Promise.resolve(promise);
                }
                return promise.then(resolve, reject);
            }
            catch (err) {
                context.error = err;
                error.publish(context);
                throw err;
            }
            finally {
                end.publish(context);
            }
        });
    }
    traceCallback(fn, position = -1, context = {}, thisArg, ...args) {
        if (!this.hasSubscribers) {
            return Reflect.apply(fn, thisArg, args);
        }
        const { start, end, asyncStart, asyncEnd, error } = this;
        function wrappedCallback(err, res) {
            if (err) {
                context.error = err;
                error.publish(context);
            }
            else {
                context.result = res;
            }
            // Using runStores here enables manual context failure recovery
            asyncStart.runStores(context, () => {
                try {
                    return Reflect.apply(callback, this, arguments);
                }
                finally {
                    asyncEnd.publish(context);
                }
            });
        }
        const callback = args.at(position);
        validateFunction(callback, 'callback');
        args.splice(position, 1, wrappedCallback);
        return start.runStores(context, () => {
            try {
                return Reflect.apply(fn, thisArg, args);
            }
            catch (err) {
                context.error = err;
                error.publish(context);
                throw err;
            }
            finally {
                end.publish(context);
            }
        });
    }
}
function tracingChannel(nameOrChannels) {
    return new TracingChannel(nameOrChannels);
}
module.exports = {
    channel,
    hasSubscribers,
    subscribe,
    tracingChannel,
    unsubscribe,
    Channel,
};
