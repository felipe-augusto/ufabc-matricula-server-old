var mongoose = require('mongoose');
require('../config/config');
var Disciplina  = require("../app/models/disciplina");
var jsonfile = require('jsonfile');

var file = 'tmp/processed.json'
 
json_obj = jsonfile.readFileSync(file);

Disciplina.collection.insert(json_obj, function (err, resp) {
	if (err) {
		console.log(err);
	} else {
		console.log("Banco de dados carregado com sucesso!");
	}
});