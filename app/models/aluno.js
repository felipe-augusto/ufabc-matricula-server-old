var mongoose = require('mongoose');

var CursoSchema = new mongoose.Schema({
	id_curso : Number,
	nome_curso : String,
	cp: Number,
	cr: Number,
	ind_afinidade : Number,
	turno : String
})

var AlunoSchema = new mongoose.Schema({
  aluno_id: { type: Number, unique: true},
  cursos: [CursoSchema]
});

module.exports = mongoose.model('Aluno', AlunoSchema); 
