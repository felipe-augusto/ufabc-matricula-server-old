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

module.exports.cursos_ids = {
	  'Bacharelado em Ciências da Computação' : 16,
	  'Bacharelado em Ciência da Computação': 16,
	  'Bacharelado em Ciência e Tecnologia': 20,
	  'Bacharelado em Ciências Biológicas': 17,
	  'Bacharelado em Ciências Econômicas': 1,
	  'Bacharelado em Ciências e Humanidades': 22,
	  'Bacharelado em Filosofia': 10,
	  'Bacharelado em Física': 28,
	  'Bacharelado em Matemática': 21,
	  'Bacharelado em Neurociência' : 24,
	  'Bacharelado em Planejamento Territorial': 11,
	  'Bacharelado em Políticas Públicas': 3,
	  'Bacharelado em Química': 14,
	  'Bacharelado em Relações Internacionais': 27,
	  'Engenharia Aeroespacial': 26,
	  'Engenharia Ambiental e Urbana': 6,
	  'Engenharia Biomédica': 18,
	  'Engenharia de Energia': 7,
	  'Engenharia de Gestão': 23,
	  'Engenharia de Informação' : 8,
	  'Engenharia de Instrumentação, Automação e Robótica': 2,
	  'Engenharia de Materiais': 15,
	  'Licenciatura em Ciências Biológicas': 13,
	  'Licenciatura em Física': 25,
	  'Licenciatura em Matemática': 9,
	  'Licenciatura em Química': 4
	}