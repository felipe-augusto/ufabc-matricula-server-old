var express = require('express'),
  router = express.Router(),
  mongoose = require('mongoose'),
  request = require('request');

var path = require('path');
var fs = require('fs');

var _ = require('lodash');

var utils = require('../utils');

// pega os models
var Aluno = require("../models/aluno");
var Disciplina = require("../models/disciplina");
var History = require("../models/history");

module.exports = function (app) {
  app.use('/', router);
};

var last_date = new Date();
var last_matriculas = new Date();

var todasMatriculas = {};

var cursos_ids = {
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


// isso serve para cadastrar um aluno no banco de dados
// a extensao do chrome faz essa requisicao
router.post('/test', function (req, res, next) {
  var cursos = req.body.data;
  var aluno_id = req.body.aluno_id;
  var cursos_salvar = [];
  var fail = false;
  for (var i = 0; i < cursos.length; i++) {
    var curso_obj = {};
    // caso falhe em carregar algo
    try {
      curso_obj['cp'] = parseFloat(cursos[i].cp.replace(',','.'));
      curso_obj['cr'] = parseFloat(cursos[i].cr.replace(',','.'));
      curso_obj['quads'] = parseFloat(cursos[i].quads.replace(',','.'));
    } catch (err) {
      res.json("erro na hora de atualizar aluno. extensao desatualizada?");
      fail = true;
      return;
    }
    curso_obj['nome_curso'] = cursos[i].curso;
    curso_obj['turno'] = cursos[i].turno;
    curso_obj['ind_afinidade'] = 0.07 * curso_obj['cr'] + 0.63 * curso_obj['cp'] + 0.005 * curso_obj['quads'];
    
    if('curso_id' in curso_obj) {
      curso_obj['id_curso'] = parseInt(curso_obj['curso_id']);
    } else {
      curso_obj['id_curso'] = cursos_ids[curso_obj['nome_curso']];
    }
    cursos_salvar.push(curso_obj);
  }
  if(!fail) {
    Aluno.findOne({aluno_id: aluno_id}).exec(function (err, aluno) {
      if(aluno) {
        aluno.cursos = cursos_salvar;
        aluno.save();
        res.json("Atualizado");
      } else {
        Aluno.create({aluno_id: aluno_id, cursos: cursos_salvar}, function (err, aluno) {
          if (err) {
            res.send(err);
          } else {
            res.send(aluno);
          }
        })
      }
    })
  } else {
    res.json("erro na hora de atualizar aluno. extensao desatualizada?");
  }
});

var discover_obg = {
  'bct' : [22,24,14,16,3,17,4,27,25,20,13,28]
}

// retorna um obj disciplina
router.post('/get_disc', function (req, res, next) {
  var disciplina_id = parseInt(req.body.disciplina_id);
  Disciplina.find({disciplina_id: disciplina_id}).lean().exec(function(error, resp){
        res.json(resp);
  });
})

// verifica quais sao as disciplinas que possuem um maior numero de alunos cadastrados
// que usam a extensao
router.get('/disc_data', function (req, res, next) {
  Disciplina.aggregate([{
      $project: {
        disciplina_id : 1,
        alunos_matriculados : 1
      }
    }, {
      $unwind: "$alunos_matriculados"
    }, {
      $group: { _id:{ disciplina_id: '$disciplina_id'}, students:{$sum:1}}
    }], function (err, resp) {
      // this find the disciplina with the maximum number of students
      var max = 0;
      var max_obj;
      for(var i = 0; i < resp.length; i++) {
        if(resp[i].students > 20) {
          console.log(resp[i]);
        }
      }
      res.json(resp);
  })
})

// simula uma disciplina -> nao estou usando esse
// se tu passar só o disciplina_id ele retorna
// nap precisa do aluno_id
router.post('/cortes', function (req, res, next) {
  var disciplina_id = parseInt(req.body.disciplina_id);
  var aluno_id = parseInt(req.body.aluno_id);
  // recebe um aluno_id e disciplina_id
  utils.fazCorte(disciplina_id, function (item) {
    res.json(item);
  });
})

// metodo que simula
// recebe um aluno_id e uma disciplina_id
// retorna a posição do aluno e o total
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
      sort_turno = 'asc';
    } else if (turno_disciplina == "noturno") {
      sort_turno = 'desc';
    }
    // se for quadrimestre ideal
    // filtra por cr, senao por cp
    var sort_type = ""
    if (ideal) {
      sort_type = 'aluno.cr';
    } else {
      sort_type = 'aluno.cp';
    }

    var test = _.orderBy(resp, ['aluno.turno', sort_type], [sort_turno, 'desc']);
    // as vezes um aluno tem dois cursos na reserva de vaga
    // apenas um deve permanecer
    // espero que ele retire o que tem cr/cp maior
    var sem_duplicados = _.uniqBy(test, 'aluno_id');  
    var pos = _.findIndex(sem_duplicados, { 'aluno_id': aluno_id });
    res.json({pos: pos + 1 , total: sem_duplicados.length});
    }
  )
})

// importa todas as disciplinas ofertadas em determinado quadrimestre
// roda apenas uma vez no quadrimestre
// essa rota precisa ser protegida
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

// update informacoes do aluno
router.post('/update_aluno', function (req, res, next) {
  // FIRST NEED TO CHECK IF THERE ARE ACTUAL DIFFERENCES BETWEEN THE NEW AND THE OLD ONE
  var id = req.body.id;
  Disciplina.find({'alunos_matriculados.aluno_id' : id}).lean().exec(function (err, resp) {
    resp.map(function (disciplina) {
      var pos = _.findIndex(disciplina.alunos_matriculados, { 'aluno_id': parseInt(id) });
      disciplina.alunos_matriculados[pos].cursos = [];
      console.log(disciplina.alunos_matriculados[pos]);
    });
  });
  res.send("done");
});

// essa funcao tem que ser rodada a cada sei la, 30 segundos
// setInterval(function () {recalculaDisciplinas();}, 60000);

// precisa testar para  ver se o post esta funcionando
router.get('/update_matriculas', function (req, res, next) {
  // var matriculas = parseInt(req.body.matriculas);
  recalculaSoft();
  res.send("done");
});


// this is for local testing purposes only
function getMatriculas(matriculas) {
  data = JSON.parse(fs.readFileSync(matriculas, 'utf8').replace('matriculas=', '').replace(';', ''));

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

  return matriculas;
}

// this is for local testing purposes only
function transformMatriculas(data) {
  var matriculas = {};

  // data sao as disciplinas que ele se matriculou
  for (var aluno_id in data) {
    for (var i = 0; i < data[aluno_id].length; i++) {
      // data[key][i] é o id_disciplina que o aluno_id (key pegou)
      try {
        matriculas[data[aluno_id][i]] = matriculas[data[aluno_id][i]].concat([parseInt(aluno_id)]);
      } catch (err) {
        matriculas[data[aluno_id][i]] = [parseInt(aluno_id)];
      }
    }
  }

  return matriculas;
}

// todasMatriculas = getMatriculas('matriculas.json');

function recalculaSoft(){
    matriculas = getMatriculas('matriculas1.json');
    
    if(Object.keys(todasMatriculas).length == 0) {
      todasMatriculas = matriculas;
    }

    var aluno_query = [];
    var add_to_discipline = {};

    // itera sobre as matriculas procurando por mudancas
    for (key in matriculas) {
      var saiu = _.difference(todasMatriculas[key], matriculas[key]); // id do aluno que saiu da disciplina
      var entraram = _.pullAll(_.xor(matriculas[key], todasMatriculas[key]), saiu); // id do aluno que entrou na disciplina
      // se der vazio, quer dizer que nada mudou
      if (saiu.length != 0) {
        saiu.map(function (item) {
          // remove aluno da Disciplina
        });
      } else if (entraram.length != 0) {
        add_to_discipline[key] = entraram;
        entraram.map(function (item) {
          aluno_query = aluno_query.concat(item);
        });
      }
    }

    Aluno.find({aluno_id : {'$in': aluno_query}}).lean().exec(function (err, users) {
    for (key in add_to_discipline) {
        var alunos = add_to_discipline[key].map(function (item) {
          return users[_.findIndex(users, { 'aluno_id': item })];
        });
        console.log(key, _.pull(alunos, undefined), add_to_discipline[key]);
        // da um update na disciplina dando um $push 
      };
    });

    // depois de atualizar o banco de dados atualiza as matriculas
    // todasMatriculas = matriculas;

    // verifica quais dessas matriculas foram modificadas e da update apenas nelas
    return;
}

function update () {
    request('https://matricula.ufabc.edu.br/cache/matriculas.js', function (error, response, body) {
      try {
        data = JSON.parse(body.replace('matriculas=', '').replace(';', ''));
      } catch (err) {
        console.log("N calculando...");
        return;
      }
      if(data) {
        if (new Date() - last_matriculas > 30000) {
              last_matriculas = new Date();
              matriculas = transformMatriculas(data);

              var changed = [];

              for (key in matriculas) {
                var saiu = _.difference(todasMatriculas[key], matriculas[key]); // id do aluno que saiu da disciplina
                var entraram = _.pullAll(_.xor(matriculas[key], todasMatriculas[key]), saiu); // id do aluno que entrou na disciplina
                // se der diferente de zero, algo mudou
                if (saiu.length != 0) {
                  console.log("Disciplina (saiu)" + key + " mudou");
                  changed.push(parseInt(key));
                }
                if (entraram.length != 0) {
                  console.log("Disciplina (entrou)" + key + " mudou");
                  changed.push(parseInt(key));
                }
              }

              // fix erro
              for (key in todasMatriculas) {
                var saiu = _.difference(todasMatriculas[key], matriculas[key]); // id do aluno que saiu da disciplina
                var entraram = _.pullAll(_.xor(matriculas[key], todasMatriculas[key]), saiu); // id do aluno que entrou na disciplina
                // se der diferente de zero, algo mudou
                if (saiu.length != 0) {
                  console.log("Disciplina (saiu)" + key + " mudou");
                  changed.push(parseInt(key));
                }
                if (entraram.length != 0) {
                  console.log("Disciplina (entrou)" + key + " mudou");
                  changed.push(parseInt(key));
                }
              }

              // make sure is unique
              changed = _.uniq(changed);

              if(changed.length > 0) {
                Disciplina.find({disciplina_id: {'$in': changed}}).exec(function (err, disciplinas) {
                  if(err) {
                    console.log(err);
                  } else {
                    // update every discipline
                    disciplinas.map(function (item) {
                      console.log("dando update em : " + item.disciplina_id);
                      var arr = matriculas[item.disciplina_id.toString()];
                      item.alunos_matriculados = arr;
                      item.save();
                    });
                    todasMatriculas = matriculas;
                    console.log('OK');
                  }
                });
              } else {
                console.log('NADA A SE FAZER');
              };
            } else {
              console.log("NAO SE PASSARAM 30 SEGUNDOS");
            }
          }
      })
}


setInterval(update, 60000);

// pega a lista de todas as matriculas feitas e dá update
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

function findQuadFromDate(month) {
  if(month == 1 || month == 2 || month == 3 || month == 4) return 1
  if(month == 5 || month == 6 || month == 7 || month == 8) return 2
  if(month == 9 || month == 10 || month == 11 || month == 0) return 3
}

function findIdeais() {
  return {
    1 : 
    [
      'BCM0506-15', // COMUNICACAO E REDES
      'BCJ0203-15', // ELETROMAG 
      'BIN0406-15', // IPE
      'BCN0405-15', // IEDO
      'BIR0004-15', // EPISTEMOLOGICAS
      'BHO0102-15', // DESENVOL. E SUSTE.
      'BHO0002-15', // PENSA. ECONOMICO
      'BHP0201-15', // TEMAS E PROBLEMAS
      'BHO0101-15', // ESTADO E RELA
      'BIR0603-15', // CTS
      'BHQ0003-15', // INTEPRE. BRASIL
      'BHQ0001-15', // IDENT.E CULTURA
    ],
    2 : [
      'BCM0504-15', // NI
      'BCN0404-15', // GA
      'BCN0402-15', // FUV
      'BCJ0204-15', // FEMEC
      'BCL0306-15', // BIODIVERSIDADE
      'BCK0103-15', // QUANTICA
      'BCL0308-15', // BIOQUIMICA
      'BIQ0602-15', // EDS
      'BHO1335-15', // FORMACAO SISTEMA INTERNACIONAL
      'BHO1101-15', // INTRODUCAO A ECONOMIA
      'BHO0001-15', // INTRODUCAO AS HUMANIDADES
      'BHP0202-15', // PENSAMENTO CRITICO
    ],
    3 : [
      'BCJ0205-15', // FETERM
      'BCM0505-15', // PI
      'BCN0407-15', // FVV
      'BCL0307-15', // TQ
      'BCK0104-15', // IAM
      'BIR0603-15', // CTS
      'BHP0001-15', // ETICA E JUSTICA
      'BHQ0301-15', // TERRITORIO E SOCIEDADE
      // ESTUDO ÉTNICOS RACIAIS
    ],
  }[findQuadFromDate(new Date().getMonth())]
}

// atualiza as disciplinas para o quad ideal
router.get('/update_ideal', function (req, res, next) {
  // para cada discipina ideal faca
  var disciplinas_ideal = findIdeais()
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

router.get('/test_look', function (req, res, next) {
  Disciplina.aggregate([{
    $match : {
      disciplina_id: 205
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
  }], function (err, disciplinas) {
    console.log(err);
    console.log(disciplinas);
    res.json(disciplinas);
  })
});

// check if user exists in database
router.post('/is_allowed', function (req, res, next) {
  var aluno_id = req.body.aluno_id;
  Aluno.findOne({aluno_id : aluno_id}).lean().exec(function (err, stu) {
    if (stu) {
      res.json("OK");
    } else {
      res.json("NOT");
    }
  })
})

// last updated time of matriculas
router.get('/last_time', function (req, res, next) {
  res.json(last_matriculas);
});

// last updated time of matriculas
router.get('/last_disciplina', function (req, res, next) {
  res.json(todasMatriculas);
});

// update matriculas database
router.post('/update_matriculas', function (req, res, next) {
  if(req.body.data != null) {
    // deixa atualiza de 30 em 30, no max
    if (new Date() - last_matriculas > 20000) {
      last_matriculas = new Date();
      matriculas = transformMatriculas(req.body.data);
      // only query the disciplines that changed
      // make sure that we got something
      // if(Object.keys(todasMatriculas).length == 0) {
      //   todasMatriculas = matriculas;
      // }

      var changed = [];

      // itera sobre as matriculas procurando por mudancas
      for (key in matriculas) {
        var saiu = _.difference(todasMatriculas[key], matriculas[key]); // id do aluno que saiu da disciplina
        var entraram = _.pullAll(_.xor(matriculas[key], todasMatriculas[key]), saiu); // id do aluno que entrou na disciplina
        // se der diferente de zero, algo mudou
        if (saiu.length != 0) {
          console.log("Disciplina (saiu)" + key + " mudou");
          changed.push(parseInt(key));
        }
        if (entraram.length != 0) {
          console.log("Disciplina (entrou)" + key + " mudou");
          changed.push(parseInt(key));
        }
      }

      // fix erro
      for (key in todasMatriculas) {
        var saiu = _.difference(todasMatriculas[key], matriculas[key]); // id do aluno que saiu da disciplina
        var entraram = _.pullAll(_.xor(matriculas[key], todasMatriculas[key]), saiu); // id do aluno que entrou na disciplina
        // se der diferente de zero, algo mudou
        if (saiu.length != 0) {
          console.log("Disciplina (saiu)" + key + " mudou");
          changed.push(parseInt(key));
        }
        if (entraram.length != 0) {
          console.log("Disciplina (entrou)" + key + " mudou");
          changed.push(parseInt(key));
        }
      }

      // make sure is unique
      changed = _.uniq(changed);

      if(changed.length > 0) {
        Disciplina.find({disciplina_id: {'$in': changed}}).exec(function (err, disciplinas) {
          if(err) {
            console.log(err);
          } else {
            // update every discipline
            disciplinas.map(function (item) {
              console.log("dando update em : " + item.disciplina_id);
              var arr = matriculas[item.disciplina_id.toString()];
              item.alunos_matriculados = arr;
              item.save();
            });
            todasMatriculas = matriculas;
            res.json('OK');
          }
        });
      } else {
        res.json('NADA A SE FAZER');
      };
    } else {
      res.json("NAO SE PASSARAM 30 SEGUNDOS");
    }
  }

})


// check if user exists in database
router.post('/api/history', function (req, res, next) {
  var ra = req.body.ra;
  var disciplinas = req.body.data;

  History.findOne({ra: ra}).exec(function (err, history) {
    if(history) {
      history.disciplinas = disciplinas;
      history.save();
      res.json("Atualizado");
    } else {
      History.create({ra: ra, disciplinas: disciplinas}, function (err, history) {
        if (err) {
          res.send(err);
        } else {
          res.send("ok");
        }
      })
    }
  })
})