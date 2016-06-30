var mongoose = require('mongoose');

var HelpSchema = new mongoose.Schema({
	ca_aluno: Number,
	url: String,
	professor: String,
	pie: String,
	cr_professor: String,
	trancamentos: String,
	reprovacoes: String,
	cr_aluno: Number
});

var DisciplinaSchema = new mongoose.Schema({
  disciplina: String,
  turma: String,
  pratica: String,
  turno: String,
  campus: String,
  teoria: String,
  teoria_help: HelpSchema,
  pratica_help: HelpSchema
});

module.exports = mongoose.model('Disciplina', DisciplinaSchema); 
