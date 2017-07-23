var fs = require('fs');
require('dotenv').config()
var utils = require('../app/utils');
var mongoose = require('mongoose');
var config = require('../config/config');

var Disciplina = require("../app/models/disciplina");

data = JSON.parse(fs.readFileSync(__dirname + "/2q2017-after.json", "utf8"));

matriculas = utils.matriculasByDisciplinas(data);

// load disiplinas

data = JSON.parse(fs.readFileSync(__dirname + "/disciplinas.json", "utf8"));

disciplinas = utils.todasDisciplinasById(data);

var mat = 1998;

var count = 0;
var TIMER = 50;

var global_error = 0;
var global_divider = 0;
var limit = 900;

console.log(
		"Deferido;" +
		"Ik" + ";" +
		"Turno" + ";" +
		"CR" + ";" +
		"CP");

for(key in matriculas) {
	count++;
	if (count > limit) {
		break;
	}
	setTimeout(audit.bind({}, key), TIMER);
	TIMER += 15;
}

var error_count = 0;

function audit(disciplina_id) {

	disciplina_id = parseInt(disciplina_id);
	utils.fazCorte(disciplina_id, function(ranking) {
		if(ranking.pos) return;
		var corte_info;
		var counter_false_after_found = 0;
		var counter_true_after_found = 0;
		var wrong = false;
		var outliers = 0;

		ranking.forEach(function (position) {
			var present = matriculas[disciplina_id].includes(position.id.toString());
			if (present == false) {
				counter_false_after_found++;
				corte_info = position;
			}

			if(counter_false_after_found != 0 && present == true) {
				counter_true_after_found++;
				outliers++;
				wrong = true;
			};

			position.present = present; 
		});

		var total = counter_false_after_found + counter_true_after_found;
		var right_percentage = counter_false_after_found / total;

		if(wrong && outliers > 2) {
			var afternoon = false;
			disciplinas[disciplina_id].horarios.forEach(function (hour) {
				afternoon = afternoon || hour.horas.includes('14:00') ||
					hour.horas.includes('15:00') ||
					hour.horas.includes('16:00') ||
					hour.horas.includes('17:00') || 
					hour.horas.includes('18:00');
			});
			if(!afternoon) {
				// console.log(disciplinas[disciplina_id].nome);
				// console.log(disciplinas[disciplina_id]);
				// ranking.forEach(function (position) {
				// 	console.log(position.id, position.present, position.ik, position.turno, position.cr, position.cp, position.reserva);
				// });
				global_error++;
			}
		} else if(corte_info) {
			console.log(disciplinas[disciplina_id].nome);
			ranking.forEach(function (position) {
				console.log( // position.id + ";" +
					position.present + ";" +
					position.ik + ";" +
					position.turno + ";" +
					position.cr + ";" +
					position.cp);
			});
		};

		// var total = counter_false_after_found + counter_true_after_found;
		// var right_percentage = counter_false_after_found / total;
		// if(total !== 0) {
		// 	global_error += right_percentage;
		// 	global_divider += 1;
		// 	if(right_percentage < 0.98) {
		// 		//console.log(error_count++ / Object.keys(matriculas).length);
		// 		//console.log(right_percentage);
		// 		ranking.forEach(function (position) {
		// 			console.log(position.present, position.ik, position.turno, position.cr, position.cp);
		// 		});
		// 	} else {
		// 		console.log(right_percentage);
		// 	}
		// }
		
		//console.log("global: ", global_error / limit);
	});
}

