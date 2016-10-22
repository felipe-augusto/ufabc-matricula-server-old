var fs = require('fs');
var difflib = require('difflib');
var jsonfile = require('jsonfile');

var help = JSON.parse(fs.readFileSync('tmp/help.json', 'utf8'));
var horarios = JSON.parse(fs.readFileSync('tmp/horarios.json', 'utf8'));

var count = 0;

find_help = [];
help_dict = {};

var file = 'tmp/processed.json'

for (var j = 0; j < help.length; j ++) {
    find_help.push(help[j].professor);
    help_dict[help[j].professor] = help[j];
}

for (var i = 0; i < horarios.length; i ++) {

    if (horarios[i].teoria != null) {
        s = new difflib.getCloseMatches(horarios[i].teoria.toLowerCase(), find_help);
        if (s[0] != null) {
            horarios[i].teoria_help = help_dict[s[0]];
        }
    }

    if (horarios[i].pratica != null) {
        s = new difflib.getCloseMatches(horarios[i].pratica.toLowerCase(), find_help);
        if (s[0] != null) {
           horarios[i].pratica_help = help_dict[s[0]];
        }
    }

    console.log("Calculando disciplina: " + i);
}

console.log("Escrevendo arquivo PDF");
jsonfile.writeFileSync(file, horarios);