var mongoose = require('mongoose');

var DisciplinaSchema = new mongoose.Schema({
  disciplina_id: {type: Number, unique: true},
  vagas: Number,
  obrigatorias: [Number],
  codigo: String,
  ideal_quad: Boolean,
  alunos_matriculados: [mongoose.model('Aluno').schema],
  turno: String
});

module.exports = mongoose.model('Disciplina', DisciplinaSchema); 
