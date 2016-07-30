var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');

var path = require('path');
var firstBy = require('thenby');

var _ = require('lodash');

// pega os models
var Aluno = require("../models/aluno");
var Disciplina = require("../models/disciplina");

module.exports = function (app) {
  app.use('/', router);
};

last_date = new Date();

var cursos_ids = {
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

router.get('/disciplinas', function (req, res, next) {
  res.charset = 'ISO-8859-1';
  res.header('Last-Modified', last_date);
  res.sendFile(path.join(__dirname, '../../build/tmp', 'processed.json'));
});

router.get('/horarios', function (req, res, next) {
  res.charset = 'ISO-8859-1';
  res.header('Last-Modified', last_date);
  res.sendFile(path.join(__dirname, '../../build/tmp', 'horarios.json'));
});


//deve fazer update, nao apenas criar
router.post('/test', function (req, res, next) {
  var cursos = req.body.data;
  var aluno_id = req.body.aluno_id;
  var cursos_salvar = [];
  for (var i = 0; i < cursos.length; i++) {
    var curso_obj = {};
    curso_obj['cp'] = parseFloat(cursos[i].cp.replace(',','.'));
    curso_obj['cr'] = parseFloat(cursos[i].cr.replace(',','.'));
    curso_obj['nome_curso'] = cursos[i].curso;
    curso_obj['turno'] = cursos[i].turno;
    curso_obj['ind_afinidade'] = 0.07 * curso_obj['cr'] + 0.63 * curso_obj['cp'];
    curso_obj['id_curso'] = cursos_ids[curso_obj['nome_curso']];
    cursos_salvar.push(curso_obj);
  }
  Aluno.create({aluno_id: aluno_id, cursos: cursos_salvar}, function (err, aluno) {
    if (err) {
      res.send(err);
    } else {
      res.send(aluno);
    }
    
  })
});

var discover_obg = {
  'bct' : [22,24,14,16,3,17,4,27,25,20,13,28]
}

// simula uma disciplina
router.post('/simula', function (req, res, next) {
  var disciplina_id = parseInt(req.body.disciplina_id);
  var aluno_id = parseInt(req.body.aluno_id);
  // recebe um aluno_id e disciplina_id
  Disciplina.aggregate([{
    $match: {disciplina_id : disciplina_id}
  }, {
    $unwind : "$alunos_matriculados"
  },{
    $unwind : "$alunos_matriculados.cursos"
  }, {
    $project: {
      turno: 1,
      ideal_quad: 1,
      aluno_id: "$alunos_matriculados.aluno_id",
      aluno : "$alunos_matriculados.cursos"
    }
  }], function (err, resp) {
    // se nao conseguir pegar o turno
    // eh pq nao tem conhecimento de nenhum cidado na turma
    try {
        var turno_disciplina = resp[0].turno;
        var ideal = resp[0].ideal_quad;
    } catch (err) {
      res.json({pos: 1, total: 1});
      return;
    }
    // escolhe como vai filtrar por turno
    var sort_turno = 0;
    if (turno_disciplina == "diurno") {
      sort_turno = 1;
    } else if (turno_disciplina == "noturno") {
      sort_turno = -1;
    }
    // aqui "faz o corte"
    // 1 -> prioridade Diurno
    // -1 -> prioridade Noturno
    //
    // alem disso precisa escolher se vai fazer por cr ou por cp
    // se for quad ideal faz por cr
    // senao faz por CP
    if (ideal) {
      resp.sort(
        firstBy('aluno.turno', sort_turno)
        .thenBy(function (v1,v2) {return v1.aluno.cr < v2.aluno.cr;})
      );
    } else {
      resp.sort(
        firstBy('aluno.turno', sort_turno)
        .thenBy(function (v1,v2) {return v1.aluno.cp < v2.aluno.cp;})
      );
    }
    var sem_duplicados = _.uniqBy(resp, 'aluno_id');
    var pos = _.findIndex(resp, { 'aluno_id': aluno_id });
    res.json({pos: pos + 1 , total: sem_duplicados.length});
    }
  )
})


// function (v1,v2) {return v1.aluno.cp < v2.aluno.cp};

// importa todas as disciplinas ofertadas em determinado quadrimestre
// roda apenas uma vez no quadrimestre
router.get('/import_disciplinas', function (req, res, next) {
  // isso eh feito apenas uma vez por quad
  // pega a lista de disciplinas com suas disciplias obrigatorias
  request('https://matricula.ufabc.edu.br/cache/todasDisciplinas.js', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      data = JSON.parse(body.replace('todasDisciplinas=', '').replace(';', ''));
      var save = [];
      // cria todas os objetos de disciplinas
      for (var j = 0; j < data.length; j++) {
        var obrigatorias = data[j].obrigatoriedades;
        var obg = [];
        // pega os cursos_id que tem essa disciplinas como obrigatoria
        for (var i = 0; i < obrigatorias.length; i++) {
          obg.push(obrigatorias[i].curso_id);
        }
        // cria obj no braço
        var obj = {};
        obj['disciplina_id'] = data[j].id;
        obj['vagas'] = data[j].vagas;
        obj['codigo'] = data[j].codigo;
        obj['obrigatorias'] = obg;
        obj['ideal_quad'] = false;
        obj['alunos_matriculados'] = [];
        if (data[j].nome.indexOf("Noturno") != -1) {
          obj['turno'] = "noturno";
        } else if (data[j].nome.indexOf("Matutino") != -1) {
          obj['turno'] = "diurno";
        }
        // push para o vetor que ira ser enviado para o DB
        save.push(obj);
      }
      // salva no banco de dados
      Disciplina.create(save, function (err, resp) {
        if (err) {
          res.send("Erro :" + err);
        } else {
          res.send("Parece que deu certo");
        }
      });
    }
  })
})

// essa funcao tem que ser rodada a cada sei la, 30 segundos

setInterval(function () {recalculaDisciplinas();}, 10000);

function recalculaDisciplinas () {
  request('https://matricula.ufabc.edu.br/cache/matriculas.js', function (error, response, body) {
    try {
      data = JSON.parse(body.replace('matriculas=', '').replace(';', ''));
    } catch (err) {
      console.log("N calculando...");
      return;
    }
    console.log("Calculando...");
    var matriculas = {};
    // cria um vetor para ser usado no mongo dos alunos
    var in_aluno = [];

    // data sao as disciplinas que ele se matriculou
    for (var aluno_id in data) {
      in_aluno.push(aluno_id);
      for (var i = 0; i < data[aluno_id].length; i++) {
        // data[key][i] é o id_disciplina que o aluno_id (key pegou)
        try {
          matriculas[data[aluno_id][i]] = matriculas[data[aluno_id][i]].concat([parseInt(aluno_id)]);
        } catch (err) {
          matriculas[data[aluno_id][i]] = [parseInt(aluno_id)];
        }
      }
    }
    // cria um vetor para ser usado no Mongo das matriculas
    var in_mat = [];
    for (key in matriculas) {
      in_mat.push(key);
    }
    // precisa dar um update das disciplinas com a info dos alunos
    Disciplina.find({disciplina_id: {'$in': in_mat}}).exec(function (err, disciplinas) {
      Aluno.find({aluno_id : {'$in': in_aluno}}).lean().exec(function (err, users) {
        // transforma users para uma hash
        var hash_users = {};
        for (var i = 0; i < users.length; i++) {
          hash_users[parseInt(users[i].aluno_id)] = users[i];
        }
        // itera sobre todas as disciplinas e atualiza suas matriculas
        for (var i = 0; i < disciplinas.length; i++) {
          var mat_disciplinas = (matriculas[disciplinas[i].disciplina_id]);
          var updated_disc = [];
          disciplinas[i].alunos_matriculados = [];
          for (var j = 0; j < mat_disciplinas.length; j++) {
            if (hash_users[mat_disciplinas[j]] != null) {
              disciplinas[i].alunos_matriculados.push(hash_users[mat_disciplinas[j]]);
            };
          }
          disciplinas[i].save();
        }
      })
    });

  })

};

// check if an element exists in array using a comparer function
// comparer : function(currentElement)
Array.prototype.inArray = function(comparer) { 
    for(var i=0; i < this.length; i++) { 
        if(comparer(this[i])) return true; 
    }
    return false; 
}; 

// adds an element to the array if it does not already exist using a comparer 
// function
Array.prototype.pushIfNotExist = function(element, comparer) { 
    if (!this.inArray(comparer)) {
        this.push(element);
    }
}; 

// NI, GA, FUV, FEMEC, BIODIVERSIDADE -> 2 QUAD
// QUANTICA, BIOQUIMICA, EDS

var disciplinas_ideal = [
  'BCM0504-15',
  'BCN0404-15',
  'BCN0402-15',
  'BCJ0204-15',
  'BCL0306-15',
  'BCK0103-15',
  'BCL0308-15',
  'BIQ0602-15'
]

// atualiza as disciplinas para o quad ideal

router.get('/update_ideal', function (req, res, next) {
  // para cada discipina ideal faca
  for (var j = 0; j < disciplinas_ideal.length; j++) {
      Disciplina.find({codigo : disciplinas_ideal[j]}).exec(function (err, resp) {
        for (var i = 0; i < resp.length; i++) {
          resp[i].ideal_quad = true;
          resp[i].save();
        } 
      })
  }
  res.json('OK');
});