var mongoose = require('mongoose');

var HistorySchema = new mongoose.Schema({
  ra : Number,
  disciplinas : Object,
})

module.exports = mongoose.model('History', HistorySchema); 