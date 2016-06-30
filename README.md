# ufabc-matricula-server

Web service que alimenta ufabc-matricula-extension, extensão para Google Chrome que extende e aumenta as funcionalidades do sistema de matrículas da UFABC.

## Primeiros passos (extraindo dados)

### Extraindo dados do UFABC HELP!

O repositório já possui um arquivo chamado **help.json**, que foi resultado de um extração de dados feita no site UFABC HELP!, caso você queria fazer sua própria extração de dados, você precisa ter uma conta no UFABC HELP! associada ao seu Facebook. Entretanto, para rodar o extrator você precisa do Python e algumas de suas dependências instalados:

```sh
$ pip install mechanize
$ pip install beautifulsoup4
```

Para rodar o extrator, dentro da pasta root navegue até a pasta build e então:

```sh
$ python load_help.py -u user_facebook -p password_facebook
```

Um arquivo chamado **help.json**, será criado com os dados extraídos do UFABC HELP! dentro da pasta `build/tmp`.

### Extraindo dados do PDF de horários da matrícula da UFABC

O arquivo **horarios.json** representa o resultado do que faremos a seguir: ainda dentro da pasta build, existe a opção de passarmos o PDF das disciplinas, turmas e horários da UFABC para extrairmos os dados pertinentes. Novamente, precisamos de algumas dependências:

```sh
$ pip install pyPDF
$ pip install requests
```

Para extrair os dados, rode:

```sh
$ python horarios_extractor.py -u url_horarios.pdf
```

Pronto, um arquivo **horarios.json** deve aparecer dentro da pasta `build/tmp`.

### Mesclando dados e Criando web service

Agora que temos ambos os arquivos **horarios.json** e **help.json** podemos mesclar os dois para obtermos uma única "tabela" que será enviada para todos os alunos que estiverem com a extensão do Google Chrome ativada. Agora começamos a fazer a transição da parte de processamento de dados para o servidor web especificamente.

Com o Node.js instalado e MongoDB também, vá dentro da pasta root digite:

```sh
$ npm install
```

Caminhe até a pasta build e então faça:

```sh
$ node build.js
```

Um arquivo **processed.json** será criado como combinação das extrações feitas anteriormente. Para facilitar nossa vida vamos enviar esse arquivo quando o usuário fizer um requisição ao invés de armazená-lo em um banco de dados. Por isso, tenha certeza que esse arquivo existe dentro da pasta `build/tmp`.

Agora é só fazer:

```sh
$ npm start
```

Abra o browser e digite o endereço: `http://localhost:3000/disciplinas`.
A lista de turmas, com seus respectivos professores e notas no UFABC HELP! deverá aparecer.
 
### TODO 1.0

- [x] Processar arquivo com a lista de professores, salas e disciplinas
- [x] Extração de dados do UFABC HELP!
- [x] Join na lista de professores com os dados do UFABC HELP!
- [x] Carregar lista para o banco de dados (DAR .JSON)
- [x] Criar endpoints da API
- [ ] Melhorar parsing do PDF de horários

## Precisa organizar

VERSÃO 1.0

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
