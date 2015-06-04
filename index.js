var uuid = require('uuid-js');
var _ = require('underscore');

var baseStore = function () {

    var store = [],
    subscribers = [],
    actions = {
        'CREATE': function (action) {
            
            var id = this._create(action.id, action.value);
            return this._emitChange(this.get(id));
            
        }.bind(this),
        
        'DESTROY': function (action) {
            
            this._destroy(action.id);
            return this._emitChange(null);
            
        }.bind(this),
        
        'UPDATE': function (action) {
            
            this._update(action.id, action.value);
            return this._emitChange(this.get(action.id));
            
        }.bind(this),
        
        'CLEAR': function (action) {
            
            this._clear(action.id);
            return this._emitChange(this.get(action.id));
            
        }.bind(this),
                
        'DROP': function () {
            
            this._drop();
            this._drop();
            return this._emitChange(null);
            
        }.bind(this),
        
        'REPLACE': function (action) {
            
            this._replace(action.id, action.value);
            return this._emitChange(this.get(action.id));
            
        }.bind(this)
    };

    this._clear = function (id) {
        
        var value = {};
        
        if (this.defaults)
            value = this.defaults();
        
        this._replace(id, value);

        return id;
    }
    
    this._drop = function () {
        
        store = [];
        
    }
    
    this._create = function (id, value) {
        
        var startValue = value;
        
        if (this.defaults)
            startValue = this.defaults();
        
        var id = id || uuid.create(1).hex;
        store.push({
            id: id,
            value: startValue
        })
        
        this._update(id, value);

        return id;

    }

    this._update = function (id, value) {
        
        if (typeof value == 'undefined')
            return;
        
        store = store.map(function(item) {
            if (item.id == id) {

                switch (typeof value) {
                    case 'object':
                        var key;
                        for (key in value)
                            item.value[key] = value[key];
                        return item;
                    break;
                    default:
                        item.value = value;
                        return item;
                    break;
                }
            }
            return item;
            
        });

    }
    
    this._replace = function (id, value) {
        
        store = store.map(function(item) {
            if (item.id == id) {
                item.value = value;
                return item;
            }
            
            return item
        })
    }
    
    this._exists = function (id) {

        return store.some(function(item) {
            return item.id == id;
        });

    }
    
    this._destroy = function (id) {

        store = store.filter(function(item) {
            return item.id != id;
        });
    }

    this._emitChange = function (value) {

        if (this.willEmitChange) this.willEmitChange(value);
        
        subscribers.forEach(function (callback) {
            callback(value);
        })
        return value;
    }

    this._registerAction = function (action, callback) {

        actions[action] = callback.bind(this);

    }

    this.emitAction = function (action, object) {

        if (!actions[action])
            return console.warn('No action called: "%s"', action);
        
        return actions[action].call(this, object)

    }

    this.last = function () {

        if (store[store.length - 1])
            return store[store.length - 1];
        
        return {
            id: null,
            value: null
        }

    }

    this.first = function () {

        if (store[0])
            return store[0];
        
        return {
            id: null,
            value: null
        }

    }
    
    this.get = function (id) {

        return _.find(store, function(item) {
            return (item.id == id); 
        })
        
    }

    this.flush = function () {

        return store;

    }

    this.subscribe = function (callback) {

        subscribers.push(callback)

    }

    this.unsubscribe = function (callback) {

        var index = subscribers.indexOf(callback);
        if (index > -1)
            subscribers.splice(index, 1);

    }
}

module.exports = {

    createStore: function (obj) {

        var store = new baseStore()
        public = {}, name;

        for (name in obj) {
            store[name] = obj[name];
        }

        if (store.constructor) store.constructor();

        for (name in store) {

            if (name[0] !== '_')
                public[name] = store[name];

        }

        return public;
    }
}