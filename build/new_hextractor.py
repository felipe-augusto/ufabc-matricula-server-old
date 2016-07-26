# -*- coding: utf-8 -*-
import pyPdf
import re
import sys
import getopt
import unicodedata
import json
import requests
import os

all_teachers = []

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
		url = 'http://prograd.ufabc.edu.br/doc/turmas_ofertadas_2016.3.pdf'
		
	
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

	regex_cursos =  "BACHARELADO EM CI\xc3\x8aNCIA E TECNOLOGIA|"\
					"BACHARELADO EM CIÊNCIAS E HUMANIDADES|"\
					"ENGENHARIAS|"\
					"ENGENHARIA AEROESPACIAL|"\
					"ENGENHARIA DE ENERGIA|"\
					"ENGENHARIA DE INSTRUMENTAÇÃO, AUTOMAÇÃO E ROBÓTICA|"\
					"ENGENHARIA BIOMÉDICA|"\
					"ENGENHARIA DE GESTÃO|"\
					"ENGENHARIA AMBIENTAL E URBANA|"\
					"ENGENHARIA DE MATERIAIS|"\
					"BACHARELADO EM MATEMÁTICA|"\
					"BACHARELADO EM FÍSICA|"\
					"BACHARELADO EM QUÍMICA|"\
					"BACHARELADO EM NEUROCIÊNCIA|"\
					"BACHARELADO EM CI\xc3\x8aNCIAS BIOL\xc3\x93GICAS|"\
					"BACHARELADO EM PLANEJAMENTO TERRITORIAL|"\
					"BACHARELADO EM CIÊNCIA DA COMPUTAÇÃO|"\
					"BACHARELADO EM RELAÇÕES INTERNACIONAIS|"\
					"LICENCIATURA EM QU\xc3\x8dMICA|"\
					"ENGENHARIA DE INFORMA\xc3\x87\xc3\x83O|"\
					"BACHARELADO EM FILOSOFIA|"\
					"BACHARELADO EM POL\xc3\x8dTICAS P\xc3\x9aBLICAS|"\
					"BACHARELADO EM CI\xc3\x8aNCIAS ECON\xc3\x94MICAS|"\
					"LICENCIATURA EM MATEM\xc3\x81TICA|"\
					"LICENCIATURA EM FILOSOFIA|"\
					"LICENCIATURA EM F\xc3\x8dSICA|"\
					"LICENCIATURA EM CI\xc3\x8aNCIAS BIOL\xc3\x93GICAS"

	def getPDFContent(path):
	    content = ""
	    p = file(path, "rb")
	    pdf = pyPdf.PdfFileReader(p)
	    for i in range(0, pdf.getNumPages()): #pdf.getNumPages()
	        content += pdf.getPage(i).extractText() + "\n"
	    # content = " ".join(content.replace(u"\xa0", " ").strip().split())
	    return content


	print "Abrindo PDF..."
	text = getPDFContent("tmp/horarios.pdf").encode("utf-8", "ignore")
	split = re.split('-\d{2}SA|-\d{2}SB', text)
	for disciplina in split:
		result = {}
		# separa professores e disciplinas
		# 0 -> disciplina
		# 1 -> professor
		separa = re.split('po\)|ré\)', disciplina)
		disciplina_dirty = separa[0]
		try:
			professor_dirty = separa[1]
		except:
			professor_dirty = None
		
		if professor_dirty is not None:
			# inicializa variaveis
			docente = ""
			turno = ""
			campus = ""
			turma = ""
			# isso nao esta bom !!!
			try:
				docente = re.split(regex_cursos, professor_dirty)[1]
				docente_tmp = re.split(regex_cursos, professor_dirty)[1].split(" ")
				docente_final = ""
				for parcial in docente_tmp:
					if parcial in docente:
						docente = docente.replace(parcial, "")
						docente_final += parcial + " "
				docente_final = docente_final.split("\n")[0]
				# remove digits
				docente_final = ''.join([i for i in docente_final if not i.isdigit()])
				# se for muito longo capaz que seja dois professores
				# vamos tentar pegar apenas o primeiro
				if len(docente_final.split(" ")) > 5:
					docente_final = " ".join(docente_final.split(" ")[:4])
			except:
				pass
				# print professor_dirty

			# separa pelo turno
			if "diurno" in disciplina_dirty:
				turno = "diurno"
			if "noturno" in disciplina_dirty:
				turno = "noturno"
			tmp = re.split('diurno|noturno', disciplina_dirty)
			# 1 -> campus
			if 'ernardo' in tmp[1]:
				campus = "São Bernardo do Campo"
			if 'anto' in tmp[1]:
				campus = "Santo André"
			# 0 -> nome da disciplina, turma
			turma = tmp[0][-3:].replace("-", "").replace(" ", "")
			nome =  tmp[0][:-3].rstrip()

			# build disciplina obj
			result['turma'] = turma
			result['turno'] = turno
			result['campus'] = campus
			result['disciplina'] = nome
			result['teoria'] = docente_final.title()
			result['pratica'] = ""
			all_teachers.append(result)

	print "Escrevendo JSON em tmp/horarios.json"	
	with open(path + '/tmp/horarios.json', 'w') as outfile:
	     json.dump(all_teachers, outfile)

	print "Removendo PDF..."
	os.remove(path + '/tmp/horarios.pdf')

if __name__ == "__main__":
    main(sys.argv[1:])
