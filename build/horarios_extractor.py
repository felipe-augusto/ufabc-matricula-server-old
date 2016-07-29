# -*- coding: utf-8 -*-
import pyPdf
import re
import sys
import getopt
import unicodedata
import json
import requests
import os

def main(argv):
	# http://prograd.ufabc.edu.br/doc/turmas_salas_docentes_sa_2016.2.pdf
	url = None

	try:
		opts, args = getopt.getopt(argv, "u:")
	except:
		print "python horarios_extractor.py"
		print "python horarios_extractor.py url_horarios.pdf"
		sys.exit()
	for opt, arg in opts:
			if opt == '-u':
				url = arg

	if url is None:
		print 'Rodando com a url padrao...'
		url = 'http://prograd.ufabc.edu.br/doc/ajuste_2016_2_turmas_docentes.pdf'
		
	
	path = os.path.dirname(os.path.realpath(__file__))
	if os.path.isfile(path + '/tmp/horarios.json'):
		os.remove(path + '/tmp/horarios.json')

	print "Fazendo download dos horarios..."
	try:
		r = requests.get(url)
	except:
		print "O link que voce passou é valido?"
		sys.exit()

	with open(path + '/tmp/horarios.pdf', 'wb') as f:
	    f.write(r.content)

	def getPDFContent(path):
	    content = ""
	    p = file(path, "rb")
	    pdf = pyPdf.PdfFileReader(p)
	    for i in range(0, pdf.getNumPages()):
	        content += pdf.getPage(i).extractText() + "\n"
	    content = " ".join(content.replace(u"\xa0", " ").strip().split())
	    return content

	print "Abrindo PDF..."
	text = getPDFContent("tmp/horarios.pdf").encode("utf-8", "ignore")
	semanas = text.split("semanal")

	codigo_disciplina = re.compile("^.*([A-Z]{3}\d*-\d{2}).*$")
	dois_professores = re.compile(".*([a-z|á|][A-Z]).*")
	match_duas_upper = re.compile(".*([A-Z]{2}).*")

	tmp = {}

	teoria = ""
	pratica = ""

	all_teachers = []


	print "Lendo PDF e criando JSON..."
	for semana in semanas:
		m = codigo_disciplina.match(semana)

		if m:
			#print m.group(1)
			data = semana.split(m.group(1))
		
			# data[0] sao os professores - talvez tenha uma semana enfiada aqui no meio

			professor_dirty = re.split("[A-Z]{5}", data[0])[0]

			pattern = re.compile("^.*\d{2}:\d{2}.*$")
			
			if pattern.match(professor_dirty):
				professor_dirty = re.split("[A-Z]{5}", data[0])[0]
				# verifica se existem duas letras maiusculas seguidas
				duas_upper = re.split("[A-Z]{2}", professor_dirty)
				if len(duas_upper) != 1:
					match = match_duas_upper.match(professor_dirty);
					for i, item in enumerate(duas_upper):
						if "quarta" in item or "quinta" in item or "sexta" in item or "segunda" in item or "terca" in item or "sabado" in item:
							pass
						else:
							if not item[0].isupper():
								professor_dirty = match.group(1)[-1] + item
							else:
								professor_dirty = item
				else:
					only_pattern = re.compile(".*\d([A-Z]).*")
					is_only = only_pattern.match(professor_dirty)
					if is_only:
						professor_dirty = is_only.group(1) + re.split("\d[A-Z]", professor_dirty)[-1]

			mp = dois_professores.match(professor_dirty)
			if mp:
				teoria = professor_dirty.split(mp.group(1))[0] + mp.group(1)[0]
				pratica = mp.group(1)[1] + professor_dirty.split(mp.group(1))[1]
				#print teoria, pratica
			else:
				if professor_dirty.startswith("0"):
					if "0" in professor_dirty[1:]:
						teoria = ''.join([i for i in professor_dirty if not i.isdigit()])
						pratica = ""
					else:
						teoria = "" 
						pratica = ''.join([i for i in professor_dirty if not i.isdigit()])
				if len(professor_dirty) > 0 and not professor_dirty.startswith("0"):
					if professor_dirty.endswith("#N/"):
						teoria =  professor_dirty.split("#N/")[0]
						teoria = ''.join([i for i in teoria if not i.isdigit()])
						pratica = ""
					if professor_dirty[-1].isdigit():
						teoria = re.split("\d", professor_dirty)[0]
						teoria = ''.join([i for i in teoria if not i.isdigit()])
						pratica = ""
				
			tmp["teoria"] = teoria
			tmp["pratica"] = pratica
			try:
				pass
				# se a disciplina tiver mais de um traco fudeu
				# tem que consertar isso depois
				splitt = tmp["disciplina"].split("-")

				flag_found = None
				# encontra qual porcao do vetor que esta o horario
				# normalmente isso eh o fim do vetor
				# antes deles vem as info de turma e disciplina
				for i, item in enumerate(splitt):
					if "diurno" in item or "noturno" in item or "Diurno" in item or "Noturno" in item:
						flag_found = i
						turno = item.split(" ")[0]
						campus = item.replace(turno + " ", "").replace("(", "").replace(")", "")

				# isso concerta o problema com mais de um traco
				# normalmente vai encontrar no 1
				# len(splitt) == 1 ta bugado
				if flag_found != 1 and len(splitt) != 1:
					for i in range(1, flag_found):
						splitt[0] += "-" + splitt[i]

				# separa a turma e a disciplina
				turma = splitt[0].split(" ")[-1]
				disciplina = splitt[0].replace(" " + turma, "")

				tmp['turma'] = turma
				tmp['turno'] = turno
				tmp['campus'] = campus
				tmp['disciplina'] = disciplina

				# isso eh completamente ineficiente
				try:
					f = open(path + '/tmp/horarios.json', 'r')
					json_tmp = json.load(f)
				except:
					json_tmp = []
				json_tmp.append(tmp)

				with open(path + '/tmp/horarios.json', 'w') as outfile:
						json.dump(json_tmp, outfile)

				f.close();

			except:
				pass

			# data[2] eh a disciplina
			# faz o processamento da disciplina
			try:
				disciplina_dirty = re.split("\d{3}", data[2])[0]
			except:
				disciplina_dirty = re.split("\d{3}", data[1])[0]

			
			if "quarta" in disciplina_dirty or "quinta" in disciplina_dirty or "sexta" in disciplina_dirty or "segunda" in disciplina_dirty or "terca" in disciplina_dirty or "sabado" in disciplina_dirty:
				disciplina_dirty = disciplina_dirty.split(")")[0] + ")"
			else:
				pass
					
			tmp["disciplina"] = disciplina_dirty
		
	print "Escrevendo JSON em tmp/horarios.json"	
	# with open(path + '/tmp/horarios.json', 'w') as outfile:
	#     json.dump(all_teachers, outfile)

	print "Removendo PDF..."
	os.remove(path + '/tmp/horarios.pdf')

if __name__ == "__main__":
    main(sys.argv[1:])