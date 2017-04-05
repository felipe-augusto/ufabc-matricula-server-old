
require('dotenv').config();
var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';
var mongoose = require('mongoose');


if(process.env.DB_USER == "true") {
  var config = {
    development: {
      root: rootPath,
      app: {
        name: 'ufabc-matricula-server'
      },
      port: process.env.PORT || 3000,
      db: 'mongodb://localhost/ufabc'
    },

    test: {
      root: rootPath,
      app: {
        name: 'ufabc-matricula-server'
      },
      port: process.env.PORT || 3000,
      db: 'mongodb://localhost/ufabc'
    },

    production: {
      root: rootPath,
      app: {
        name: 'ufabc-matricula-server'
      },
      port: process.env.PORT || 3000,
      db: 'mongodb://localhost/ufabc'
    }
  };
} else {
  var URI = 'mongodb://' + process.env.DB_USER + ':' + process.env.DB_PASSWORD + '@ds151450.mlab.com:51450/ufabc3';
  var config = {
    development: {
      root: rootPath,
      app: {
        name: 'ufabc-matricula-server'
      },
      port: process.env.PORT || 3000,
      db: URI
    },

    test: {
      root: rootPath,
      app: {
        name: 'ufabc-matricula-server'
      },
      port: process.env.PORT || 3000,
      db: URI
    },

    production: {
      root: rootPath,
      app: {
        name: 'ufabc-matricula-server'
      },
      port: process.env.PORT || 3000,
      db: URI
    }
  };
}







mongoose.connect(config[env].db);

mongoose.connection.on('connected', function () {
console.log('Mongoose connected to ' + config[env].db);
});

mongoose.connection.on('error',function (err) {
console.log('Mongoose connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
console.log('Mongoose disconnected');
});

var gracefulShutdown = function (msg, callback) {
  mongoose.connection.close(function () {
    console.log('Mongoose disconnected through ' + msg);
    callback();
  });
};

// nodemon restarts
process.once('SIGUSR2', function () {
  gracefulShutdown('nodemon restart', function () {
    process.kill(process.pid, 'SIGUSR2');
  });
});

// app terminated
process.on('SIGINT', function () {
  gracefulShutdown('app termination', function () {
    process.exit(0);
  });
});

// heroku app termination
process.on('SIGTERM', function() {
  gracefulShutdown('Heroku app shutdown', function () {
    process.exit(0);
  });
});

module.exports = config[env];