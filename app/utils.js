var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');

var _ = require('lodash');
var Disciplina = require("./models/disciplina");

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

// pega as matriculas efetuadas por todos os alunos
module.exports.getCortes = function (id, vagas, nomes, requisicoes, obg, codigo, cb) {
	fazCorte(id, function (body, criterio) {
		cb(vagas, nomes, requisicoes, id, obg, codigo, body, criterio);
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
	  'Bacharelado em Políticas Públicas': 31,
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

module.exports.disciplinas_ideal = [
  'BCJ0205-15', // FETERM
  'BCM0505-15', // PI
  'BCN0407-15', // FVV
  'BCL0307-15', // TQ
  'BCK0104-15', // IAM
  'BIR0603-15' // CTS
]

module.exports.fazCorte = fazCorte;

function fazCorte (disciplina_id, cb) {
  Disciplina.aggregate([{
    $match : {
      disciplina_id: disciplina_id
    }
  },{
    $unwind : "$alunos_matriculados"
  },{
   $lookup:
     {
       from: "alunos",
       localField: "alunos_matriculados",
       foreignField: "aluno_id",
       as: "alunos_matriculados"
     }
  },
  {
    $match: { "alunos_matriculados": { $ne: [] } }
  },{
    $unwind : "$alunos_matriculados"
  },{
    $unwind : "$alunos_matriculados.cursos"
  }, {
    $project: {
      turno: 1,
      ideal_quad: 1,
      aluno_id: "$alunos_matriculados.aluno_id",
      aluno : "$alunos_matriculados.cursos",
      obrigatorias: "$obrigatorias"
    }
  }], function (err, resp) {
    // se nao conseguir pegar o turno
    // eh pq nao tem conhecimento de nenhum cidado na turma
    try {
        var turno_disciplina = resp[0].turno;
        var ideal = resp[0].ideal_quad;
    } catch (err) {
      cb({pos: 1, total: 1});
      return;
    }
    // verifica se tem reserva de vaga
    var cleaned = resp.map(function (item) {
      _.pull(item.obrigatorias, 22, 20); // BCT e BCH
      var reserva = _.includes(item.obrigatorias, item.aluno.id_curso);
      if (!reserva) {
        item.aluno.ind_afinidade = 0;
      }
      return {  cr : item.aluno.cr,
                cp: item.aluno.cp,
                ik: item.aluno.ind_afinidade,
                reserva: reserva,
                turno: item.aluno.turno,
                curso: item.aluno.nome_curso,
                id: item.aluno_id}
    });
    // escolhe como vai filtrar por turno
    var sort_turno = 0;
    if (turno_disciplina == "diurno") {
      sort_turno = 'asc';
    } else if (turno_disciplina == "noturno") {
      sort_turno = 'desc';
    }

    var sort_type = ""
    if (ideal) {
      sort_type = 'cr';
    } else {
      sort_type = 'cp';
    }

    var test = _.orderBy(cleaned, ['reserva', 'turno', 'ik', sort_type], ['desc', sort_turno, 'desc', 'desc']);
    var sem_duplicados = _.uniqBy(test, 'id');
    cb(sem_duplicados, sort_type);
    }
  )
}