var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');
  fs = require('fs');

var _ = require('lodash');
var Disciplina = require("./models/disciplina");

// pega a lista de disciplinas, horarios do site da matricula
module.exports.getDisciplinas = function (cb) {
		request.get("https://matricula.ufabc.edu.br/cache/todasDisciplinas.js", function (error, response, body) {
    try {
			data = JSON.parse(body.replace('todasDisciplinas=', '').replace(';', ''));
      data = JSON.parse(fs.readFileSync(__dirname + "/data/todasDisciplinas.js", "utf8")
        .replace('todasDisciplinas=', '')
        .replace(';', ''));
      var new_data = {}
      for(key in data) {
        new_data[data[key].id] = data[key];
      }
      cb(new_data);
		} catch (err) {
			//getDisciplinas();
		}
	});
}

// pega a contagem de creditos por disciplina
module.exports.getContagem = function (cb) {
		request.get("https://matricula.ufabc.edu.br/cache/contagemMatriculas.js", function (error, response, body) {
		try {
			data = JSON.parse(body.replace('contagemMatriculas=', '').replace(';', ''));
			data = JSON.parse(fs.readFileSync(__dirname + "/data/contagemMatriculas.js", "utf8")
        .replace('contagemMatriculas=', '')
        .replace(';', ''));
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
			data = JSON.parse(fs.readFileSync(__dirname + "/data/matriculas.js", "utf8")
        .replace('matriculas=', '')
        .replace(';', ''));
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
  'Bacharelado em Ciências da Computação' : 73,
  'Bacharelado em Ciência da Computação': 73,
  'Bacharelado em Ciência e Tecnologia': 76,
  'Bacharelado em Ciências Biológicas': 72,
  'Bacharelado em Ciências Econômicas': 60,
  'Bacharelado em Ciências e Humanidades': 78,
  'Bacharelado em Filosofia': 66,
  'Bacharelado em Física': 84,
  'Bacharelado em Matemática': 77,
  'Bacharelado em Neurociência' : 80,
  'Bacharelado em Planejamento Territorial': 67,
  'Bacharelado em Políticas Públicas': 58,
  'Bacharelado em Química': 70,
  'Bacharelado em Relações Internacionais': 83,
  'Engenharia Aeroespacial': 82,
  'Engenharia Ambiental e Urbana': 61,
  'Engenharia Biomédica': 74,
  'Engenharia de Energia': 62,
  'Engenharia de Gestão': 79,
  'Engenharia de Informação' : 64,
  'Engenharia de Instrumentação, Automação e Robótica': 57,
  'Engenharia de Materiais': 71,
  'Licenciatura em Ciências Biológicas': 69,
  'Licenciatura em Filosofia':  65,
  'Licenciatura em Física': 81,
  'Licenciatura em Matemática': 63,
  'Licenciatura em Química': 59
	}

module.exports.disciplinas_ideal = [
  'BCM0506-15', //COMUNICACAO E REDES
  'BCJ0203-15', // ELETROMAG 
  'BIN0406-15', // IPE
  'BCN0405-15', // IEDO
  'BIR0004-15', //EPISTEMOLOGICAS
  'BHO0102-15', // DESENVOL. E SUSTE.
  'BHO0002-15', // PENSA. ECONOMICO
  'BHP0201-15', // TEMAS E PROBLE
  'BHO0101-15', // ESTADO E RELA
  'BIR0603-15', // CTS
  'BHQ0003-15', // INTEPRE. BRASIL
  'BHQ0001-15', // IDENT.E CULTURA
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
      _.pull(item.obrigatorias, 20, 22); // BCT e BCH
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
    var sort_second_type = ""
    if (ideal) {
      sort_type = 'cr';
      sort_second_type = 'cp';
    } else {
      sort_type = 'cp';
      sort_second_type = 'cr';
    }

    var test = _.orderBy(cleaned, ['reserva', 'turno', 'ik', sort_type, sort_second_type], ['desc', sort_turno, 'desc', 'desc', 'desc']);
    var sem_duplicados = _.uniqBy(test, 'id');
    cb(sem_duplicados, sort_type);
    }
  )
}

module.exports.todasDisciplinasById = function (todasDisciplinas) {
  var disciplinas = {};
  todasDisciplinas.forEach(function(disciplina){
    disciplinas[disciplina.id] = disciplina;
  })

  return disciplinas;
};

module.exports.matriculasByDisciplinas = function (matriculas) {
  var disciplinas = {};
  for (aluno_id in matriculas) {
    matriculas[aluno_id].forEach(function (disciplina_id) {
      (disciplinas[disciplina_id] = disciplinas[disciplina_id] || [])
        .push(aluno_id);
    })
  }
  return disciplinas;
};