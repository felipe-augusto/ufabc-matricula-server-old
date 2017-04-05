var express = require('express'),
  config = require('./config/config'),
  glob = require('glob');

var cors = require('cors');
var bodyParser = require('body-parser');


require('dotenv').config();

var models = glob.sync(config.root + '/app/models/*.js');
models.forEach(function (model) {
  require(model);
});

var app = express();
// allow bigger payloads
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
// allow cors
app.use(cors({ origin : "*"} ));

require('./config/express')(app, config);
app.use('/static', express.static(__dirname + '/public'));

// root send ufabc stats
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(config.port, function () {
  console.log('Express server listening on port ' + config.port);
});

