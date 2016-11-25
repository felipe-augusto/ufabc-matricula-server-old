var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');

// pega a lista de disciplinas, horarios do site da matricula
module.exports.getDisciplinas = function (cb) {
		request.get("https://matricula.ufabc.edu.br/cache/todasDisciplinas.js", function (error, response, body) {
		try {
			data = JSON.parse(body.replace('todasDisciplinas=', '').replace(';', ''));
			cb(data);
		} catch (err) {
			//getDisciplinas();
		}
	})
}

// pega a contagem de creditos por disciplina
module.exports.getContagem = function (cb) {
		request.get("https://matricula.ufabc.edu.br/cache/contagemMatriculas.js", function (error, response, body) {
		try {
			data = JSON.parse(body.replace('contagemMatriculas=', '').replace(';', ''));
			cb(data);
		} catch (err) {
			//getContagem();
		}
	})
}

// pega as matriculas efetuadas por todos os alunos
module.exports.getMatriculas = function (cb) {
		request.get("https://matricula.ufabc.edu.br/cache/matriculas.js", function (error, response, body) {
		try {
			data = JSON.parse(body.replace('matriculas=', '').replace(';', ''));
			cb(data);
		} catch (err) {
			//getMatriculas();
		}
	})
}