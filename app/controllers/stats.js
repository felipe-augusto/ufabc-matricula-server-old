var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');

var _ = require('lodash');
var utils = require('../utils');

module.exports = function (app) {
  app.use('/stats/', router);
};

// variaveis globais que evitam retrabalho
// pois as informacoes nao mudam
var contagemMatriculas, todasDisciplinas, matriculas;
var materias_alunos = {};
var grouped_disciplinas = {};
var demanda_geral = {};
var chutes_inevitaveis = {};
var info_all_cursos = {};

// peagando as informacoes necessarias no site do matriculas
utils.getDisciplinas(function (item) {
	todasDisciplinas = item;
});

utils.getContagem(function (item) {
	contagemMatriculas = item;
});

utils.getMatriculas(function (item) {
	matriculas = item;
});

// end point que lista qual o numero de alunos que pega certo numero de materias
router.get('/materias_alunos', function (req, res, next) {
  res.json(calculaMateriasPorAluno());
});

// calcula a demanda de determinado curso
// type -> abs_ratio, rel_ratio
// passe curso_id = 0, caso nao queira filtrar por curso
router.get('/demanda/:turno/:type/:curso_id', function (req, res, next) {
	res.json(calculaDemanda(req.params.turno, req.params.type, parseInt(req.params.curso_id)));
  
});

// pega a demanda geral da universidade
router.get('/demanda_geral', function (req, res, next) {
  res.json(calculaDemandaGeral());
});

// devolve o numero de chutes inevitaveis
router.get('/chutes_inevitaveis', function (req, res, next) {
  res.json(chutesInevitaveis());
});

// pega as informacoes de determinado curso
// passe id = 0, caso nao queira filtrar por curso
router.get('/info_curso/:id', function (req, res, next) {
  res.json(infoCurso(req.params.id));
});

// devolve informacoes gerais sobre todos os curso
// order pode assumir diversos valores: vide o object que a funcao retorna
router.get('/info_all_cursos/:order', function (req, res, next) {
  for (key in utils.cursos_ids) {
  	info_all_cursos[key] = infoCurso(utils.cursos_ids[key]);
  	info_all_cursos[key].curso = key;
  }
  res.json(_.orderBy(info_all_cursos, ['numeros.' + req.params.order], ['desc']));
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

// lista as disciplinas mais concorridas de determinado curso
function calculaDemanda(generic, type, id) {
	if(Object.keys(grouped_disciplinas).length != 0) {
		// filtra pelo curso
		var por_curso = filtraCurso(id);
		// ordena dependendo do criterio passado no endpoint
		var resp = _.orderBy(por_curso, [generic, generic + '.' + type], ['asc', 'desc']);
		return resp;
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
			// variancia noturno
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
		// ordena dependendo do criterio passado no endpoint
		var resp =_.orderBy(por_curso, [generic, generic + '.' + type], ['asc', 'desc']);
		// dados de um curso especifico
		return resp;
		
	}
}

// lista vagas, requisicoes, etc de determinado curso
function infoCurso(id) {
	return estatisticasCurso(filtraCurso(parseInt(id)));
}

// calcula as estatisticas de determinado curso
function estatisticasCurso(resp) {
	var total_vagas_geral = 0;
	var total_requisicoes_geral = 0;
	var total_vagas_matutino = 0;
	var total_vagas_noturno = 0;
	var total_requisicoes_matutino = 0;
	var total_requisicoes_noturno = 0;
	resp.map(function (item) {
		total_vagas_geral += item.geral.vagas;
		total_requisicoes_geral += item.geral.requisicoes;
		if(item.noturno) {
			total_vagas_noturno += item.noturno.vagas;
			total_requisicoes_noturno += item.noturno.requisicoes;
		}
		if(item.matutino) {
			total_vagas_matutino += item.matutino.vagas;
			total_requisicoes_matutino += item.matutino.requisicoes;
		}
	});
	return { 
			numeros: {
				"total_vagas_geral": total_vagas_geral,
				"total_requisicoes_geral" : total_requisicoes_geral,
				"gap_geral_abs" : total_requisicoes_geral - total_vagas_geral,
				"gap_geral_rel" : total_requisicoes_geral / total_vagas_geral,
				"total_vagas_matutino" : total_vagas_matutino,
				"total_requisicoes_matutino" : total_requisicoes_matutino,
				"gap_matutino_abs": total_requisicoes_matutino - total_vagas_matutino,
				"gap_matutino_rel" : total_requisicoes_matutino / total_vagas_matutino,
				"total_vagas_noturno": total_vagas_noturno,
				"total_requisicoes_noturno": total_requisicoes_noturno,
				"gap_noturno_abs": total_requisicoes_noturno - total_vagas_noturno,
				"gap_noturno_rel" : total_requisicoes_noturno / total_vagas_noturno
			}
		}
}

// filtra apenas as disciplinas de determinado curso dentre todas as disciplinas
function filtraCurso(id) {
	var tmp = [];
	// caso nao queira filtrar por curso
	if(id == 0) {
		return _.filter(grouped_disciplinas,
			function(item){
				return true;
		});
	}
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

// calcula demanda da universidade como um todo
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

// calcula o numero de chutes inevitaveis, que so sao resolvido com aumento de sala
// realocao nao funciona
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