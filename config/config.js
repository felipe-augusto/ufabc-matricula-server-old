var path = require('path'),
    rootPath = path.normalize(__dirname + '/..'),
    env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    root: rootPath,
    app: {
      name: 'ufabc-matricula-server'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/ufabc-matricula-server-development'
  },

  test: {
    root: rootPath,
    app: {
      name: 'ufabc-matricula-server'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/ufabc-matricula-server-test'
  },

  production: {
    root: rootPath,
    app: {
      name: 'ufabc-matricula-server'
    },
    port: process.env.PORT || 3000,
    db: 'mongodb://localhost/ufabc-matricula-server-production'
  }
};

module.exports = config[env];
