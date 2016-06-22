# ufabc-matricula-server

# TODO

VERSÃO 1.0

ANTES:
-> Processar arquivo com a lista de professores, salas e disciplinas
-> Web scrapy no servidor do UFABC HELP para não ferrar com as queries
-> Isso precisa de um servidor

EXTENSÃO:

-> Adiciona no matriculas (professor, CR dos alunos, CR professor, reprovações, link direto para o ufabchelp - PIE chart (?) )
-> Adiciona opções de ordenar por CR dos alunos, CR professor, % reprovações
-> Todo dia atualizar o banco com os dados do help por exemplo as 5 da manhã para não ferrar o HELP
-> Como as matérias já estão predefinidas só existe uma query que manda todas as informações - api tem apenas um endpoint (!?)
-> Pode gerar o servidor apenas no período de matricula e rematricula
-> Se o usuário visitar aluno.ufabc.edu.br -> pegar os dados dele e guardar num localStorage para eliminar disciplinas já cursadas (ELABORAR MELHOR)

VERSÃO 2.0

-> GUARDA AS MATÉRIAS QUE A PESSOA PEGOU E COLOCA AS INFORMAÇÕES DE CORTE

-> CIDADAO TERIA QUE CADASTRAR QUAL CURSO ESTÁ MATRICULADO, TURNO, CR E CP (USAR CHROME LOCAL STORAGE !? - PEDIR PARA ELE NAVEGAR ATÉ aluno.matricula.ufabc e pegamos as info !?) - QUAL A POLITICA DE PRIVACIDADE?

-> QUANDO SUBMETER UMA MATRICULA
    -> GUARDAR NO BANCO DE DADOS TODAS AS MATRICULAS DE UM DETERMINADO ID (dá pra fazer com regex na url)

-> QUERY QUE RETORNA A POSIÇÃO E SE VAI SER CHUTADO (se fizer isso para todas - fudeu - in browser talvez? - retornando os parametros de corte ?) - (IVAN, ACHO QUE VOCE JA RESOLVEU ISSO)
    -> MANDA O ID DA DISCIPLINA E RETORNA SE VAI SER CHUTADO OU NÃO (?)
    
VERSÃO 3.0

-> OPÇÃO DE COLOCAR ALERTAS PARA LIBERAÇÃO DE VAGAS EM DISCIPLINAS (quando uma vaga é liberada na disciplinas, todas as pessoas que marcaram para receber alerta são avisadas automaticamente - isso desvaforece a prática de trocas/vendas de disciplinas.
