'use strict';
/*global require, module*/

var Thunk = require('thunks')(),
  Baseco = require('Baseco'),
  tools = require('../lib/tools.js'),
  json = require('./lib/json.js'),
  collection = require('./dao/mongoDao.js').db.bind('messages'),
  union = tools.union,
  intersect = tools.intersect,
  defautMessage = jsGen.lib.json.Message;

var baseco = new Baseco(62, json.IDString);

exports.convertID = function (id) {
  switch (typeof id) {
    case 'string':
      id = id.substring(1);
      return baseco.gToD(id);
    case 'number':
      id = baseco.dToG(id);
      while (id.length < 3) id = '0' + id;
      return 'M' + id;
  }
};

exports.getMessagesNum = function () {
  return Thunk(function (callback) {
    collection.count(callback);
  });
};

exports.getLatestId = function getLatestId(callback) {
  return Thunk(function (callback) {
    collection.findOne({}, {
      sort: {
        _id: -1
      },
      hint: {
        _id: 1
      },
      fields: {
        _id: 1
      }
    }, callback);
  });
};

exports.getMessagesList = function (_idArray) {
  return Thunk(function (callback) {
    if (!Array.isArray(_idArray)) _idArray = [_idArray];

    collection.find({
      _id: {
        $in: _idArray
      }
    }, {
      fields: {
        author: 1,
        date: 1,
        title: 1,
        content: 1
      }
    }).toArray(callback);
  });
};

exports.getMessage = function (_id) {
  return Thunk(function (callback) {
    collection.findOne({
      _id: _id
    }, {
      sort: {
        _id: -1
      },
      fields: {
        author: 1,
        receiver: 1,
        date: 1,
        title: 1,
        content: 1
      }
    }, callback);
  });
};

exports.setMessage = function (messageObj) {
  return Thunk(function (callback) {
    var query = {},
      setObj = {},
      newObj = {
        receiver: {
          _id: 0,
          read: false
        }
      };

    newObj = intersect(newObj, messageObj);

    collection.update({
      _id: messageObj._id,
      'receiver._id': newObj.receiver._id
    }, {
      $set: {
        'receiver.$.read': true
      }
    }, callback);
  });
};

exports.setNewMessage = function (messageObj) {
  return Thunk(function (callback) {
    var message = union(defautMessage),
        newMessage = union(defautMessage);

    newMessage = intersect(newMessage, messageObj);
    newMessage = union(message, newMessage);
    newMessage.date = Date.now();

    getLatestId(function (err, doc) {
      if (err) return callback(err);

      newMessage._id = doc ? (doc._id + 1) : 1;
      collection.insert(newMessage, {w: 1}, callback);
    });
  });
};

exports.delMessage = function (_id) {
  return Thunk(function (callback) {
    collection.remove({
      _id: _id
    }, {
      w: 1
    }, callback);
  });
};
