var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');

var _ = require('lodash');
var utils = require('../utils');

module.exports = function (app) {
  app.use('/stats/', router);
};

var contagemMatriculas, todasDisciplinas, matriculas;
var materias_alunos = {};
var grouped_disciplinas = {};
var demanda_geral = {};
var chutes_inevitaveis = {};

utils.getDisciplinas(function (item) {
	todasDisciplinas = item;
});

utils.getContagem(function (item) {
	contagemMatriculas = item;
});

utils.getMatriculas(function (item) {
	matriculas = item;
});

router.get('/materias_alunos', function (req, res, next) {
  res.json(calculaMateriasPorAluno());
});

router.get('/demanda/:turno/:type/:disc', function (req, res, next) {
	res.json(calculaDemanda(req.params.turno, req.params.type, parseInt(req.params.disc)));
  
});

router.get('/demanda_geral', function (req, res, next) {
  res.json(calculaDemandaGeral());
});

router.get('/chutes_inevitaveis', function (req, res, next) {
  res.json(chutesInevitaveis());
});


// calcula quantas disciplinas uma pessoa pegou
function calculaMateriasPorAluno() {
	// ve se ja calculou alguma vez
	if(Object.keys(materias_alunos).length != 0) {
		return materias_alunos;
	} else {
		for(key in matriculas) {
			if(materias_alunos[matriculas[key].length]) {
				materias_alunos[matriculas[key].length] += 1;
			} else {
				materias_alunos[matriculas[key].length] = 1;
			}
		};
		return materias_alunos;
	}
}

function calculaDemanda(generic, type, id) {
	if(Object.keys(grouped_disciplinas).length != 0) {
		var por_curso = filtraCurso(id);
		por_curso.map(function(item) {
			delete item.curso;
		})
		return _.orderBy(por_curso, [generic, generic + '.' + type], ['asc', 'desc']).slice(0,30);
	} else {
		for (key in contagemMatriculas) {
			var name, turno;
			if(todasDisciplinas[key] != null) {
				// descobreo nome da disciplina
				name = todasDisciplinas[key].nome.split("(")[0].replace(/\s[A-Z]\d*-(Matutino|Noturno|matutino|noturno)/, "").trim();
				// descobre o turno
				if(todasDisciplinas[key].nome.indexOf('atutino') != -1) {
					turno = 'matutino';
				} else {
					turno = 'noturno';
				}
				// verifica se existe um numero de matriculas nesta disciplina
				if(!isNaN(parseInt(contagemMatriculas[todasDisciplinas[key].id]))) {
					var vagas = todasDisciplinas[key].vagas;
					var requisicoes = parseInt(contagemMatriculas[todasDisciplinas[key].id]);
					if(grouped_disciplinas[name]) {
						// geral temos certeza que existe
						grouped_disciplinas[name].geral.vagas += vagas;
						grouped_disciplinas[name].geral.requisicoes += requisicoes;
						// se turno existe incrementa, senao cria
						if(grouped_disciplinas[name][turno]){
							grouped_disciplinas[name][turno].vagas += vagas;
							grouped_disciplinas[name][turno].requisicoes += requisicoes;
						} else {
							grouped_disciplinas[name][turno] = {};
							grouped_disciplinas[name][turno].vagas = vagas;
							grouped_disciplinas[name][turno].requisicoes = requisicoes;
						}
					} else {
						// contagem mais geral
						grouped_disciplinas[name] = {
							"geral": {
								"vagas": vagas,
								"requisicoes": requisicoes,
							},
							"nome": name,
							"curso" : todasDisciplinas[key].obrigatoriedades
						};
						/// especifico do turno
						grouped_disciplinas[name][turno] = {};
						grouped_disciplinas[name][turno].vagas = vagas;
						grouped_disciplinas[name][turno].requisicoes = requisicoes;
					}
				}
				
			}
		}
		for(key in grouped_disciplinas) {
			// variancia geral
			var variance = grouped_disciplinas[key].geral.requisicoes / grouped_disciplinas[key].geral.vagas;
			var diff = grouped_disciplinas[key].geral.requisicoes - grouped_disciplinas[key].geral.vagas;
			grouped_disciplinas[key].geral.abs_ratio = diff;
			grouped_disciplinas[key].geral.rel_ratio = variance;
			// variancia noturn o
			if(grouped_disciplinas[key].noturno) {
				var variance = grouped_disciplinas[key].noturno.requisicoes / grouped_disciplinas[key].noturno.vagas;
				var diff = grouped_disciplinas[key].noturno.requisicoes - grouped_disciplinas[key].noturno.vagas;
				grouped_disciplinas[key].noturno.abs_ratio = diff;
				grouped_disciplinas[key].noturno.rel_ratio = variance;
			}
			// variancia diurno
			if(grouped_disciplinas[key].matutino) {
				var variance = grouped_disciplinas[key].matutino.requisicoes / grouped_disciplinas[key].matutino.vagas;
				var diff = grouped_disciplinas[key].matutino.requisicoes - grouped_disciplinas[key].matutino.vagas;
				grouped_disciplinas[key].matutino.abs_ratio = diff;
				grouped_disciplinas[key].matutino.rel_ratio = variance;
			}
		}
		// filtrar por curso
		var por_curso = filtraCurso(id);
		por_curso.map(function(item) {
			delete item.curso;
		})
		return _.orderBy(por_curso, [generic, generic + '.' + type], ['asc', 'desc']).slice(0,30);
	}
}

function filtraCurso(id) {
	var tmp;
	// um dos BI's
	if(id == 20 || id == 22) {
		tmp =  _.filter(grouped_disciplinas,
			function(item){
				return _.find(item.curso, {'curso_id' : id, 'obrigatoriedade': 'obrigatoria'});
		});
	} else { // qualquer outro curso
		tmp =  _.filter(grouped_disciplinas,
			function(item){
				return _.find(item.curso, {'curso_id' : id}) && // curso desejado
					!_.find(item.curso, {'curso_id' : 20, 'obrigatoriedade': 'obrigatoria'}) && // tira bct
					!_.find(item.curso, {'curso_id' : 22, 'obrigatoriedade': 'obrigatoria'}); // tira bch
		});
	}
	return tmp;
}

function calculaDemandaGeral() {
	if(Object.keys(demanda_geral).length != 0) {
		return demanda_geral;
	} else {
		if(Object.keys(grouped_disciplinas).length == 0) {
			calculaDemanda('geral', 'abs_ratio');
		}
		var geral_req = 0;
		var noturno_req = 0;
		var matutino_req = 0;
		var geral_vagas = 0;
		var noturno_vagas = 0;
		var matutino_vagas = 0;
		for(key in grouped_disciplinas) {
			geral_req += grouped_disciplinas[key].geral.requisicoes;
			geral_vagas += grouped_disciplinas[key].geral.vagas;
			if(grouped_disciplinas[key].noturno) {
				noturno_req += grouped_disciplinas[key].noturno.requisicoes;
				noturno_vagas += grouped_disciplinas[key].noturno.vagas;
			}
			if(grouped_disciplinas[key].matutino) {
				matutino_req += grouped_disciplinas[key].matutino.requisicoes;
				matutino_vagas += grouped_disciplinas[key].matutino.vagas;
			}
		}
		demanda_geral = {
			"geral" : {
				vagas: geral_vagas,
				requisicoes: geral_req
			},
			"noturno": {
				vagas: noturno_vagas,
				requisicoes: noturno_req
			},
			"matutino" : {
				vagas: matutino_vagas,
				requisicoes: matutino_req
			}
		}
		demanda_geral.geral.diff = demanda_geral.geral.requisicoes - demanda_geral.geral.vagas;
		demanda_geral.noturno.diff = demanda_geral.noturno.requisicoes - demanda_geral.noturno.vagas;
		demanda_geral.matutino.diff = demanda_geral.matutino.requisicoes - demanda_geral.matutino.vagas;
		return demanda_geral;
	}
}

function chutesInevitaveis() {
	if(Object.keys(chutes_inevitaveis).length != 0) {
		return chutes_inevitaveis;
	} else {
		if(Object.keys(grouped_disciplinas).length == 0) {
			calculaDemanda('geral', 'abs_ratio');
		}
		var ine_geral = 0;
		var ine_noturno = 0;
		var ine_matutino = 0;
		for(key in grouped_disciplinas) {
			// geral
			if(grouped_disciplinas[key].geral.rel_ratio > 1) {
				ine_geral += grouped_disciplinas[key].geral.abs_ratio;
			}
			if(grouped_disciplinas[key].noturno && grouped_disciplinas[key].noturno.rel_ratio > 1) {
				ine_noturno += grouped_disciplinas[key].noturno.abs_ratio;;
			}
			if(grouped_disciplinas[key].matutino && grouped_disciplinas[key].matutino.rel_ratio > 1) {
				ine_matutino += grouped_disciplinas[key].matutino.abs_ratio;;
			}
		}
		chutes_inevitaveis = {
			"geral" : ine_geral,
			"noturno" : ine_noturno,
			"diurno": ine_matutino
		}
		return chutes_inevitaveis;
	}
}