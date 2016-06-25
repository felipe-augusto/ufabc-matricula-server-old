import re
import sys
import getopt
import json
import mechanize
from bs4 import BeautifulSoup


def main(argv):
    email = None
    password = None

    try:
        opts, args = getopt.getopt(argv, "u:p:")
    except:
        print 'load_help.py -u user_facebook -p password_facebook'
        sys.exit(2)
    for opt, arg in opts:
        if opt == '-u':
            email = arg
        elif opt == '-p':
            password = arg

    if email is None and password is None:
        print 'usuario ou password nulos'
        sys.exit()

    print 'Criando Browser...'
    browser = mechanize.Browser()
    browser.set_handle_robots(False)
    cookies = mechanize.CookieJar()
    browser.set_cookiejar(cookies)
    browser.addheaders = [
        ('User-agent', 'Mozilla/5.0 (X11; U; Linux i686; en-US) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7')]
    browser.set_handle_refresh(False)

    print 'Efetuando Login no Facebook...'

    url = 'http://www.facebook.com/login.php'
    browser.open(url)
    browser.select_form(nr=0)
    browser.form['email'] = email
    browser.form['pass'] = password
    response = browser.submit()

    print 'Efetuando Login no UFABC HELP!'

    browser.open("http://www.ufabchelp.me/avaliacoes/")
    response1 = browser.follow_link(text_regex=r"Login com Facebook", nr=0)

    json_previous = []

    previous = 0

    try:
        f = open('tmp/help.json', 'r')
        json_previous = json.load(f)
        for item in json_previous:
            previous = item['id']
        f.close()
    except:
        pass

    print "Comecando do professor numero: " + str(previous + 1)

    # 693
    for i in range(previous + 1, 694):
        try:
            f = open('tmp/help.json', 'rw')
        except:
            f = open('tmp/help.json', 'w')

        try:
            data = json.load(f)
        except:
            data = []

        url = 'http://www.ufabchelp.me/painel/professor.php?i=' + str(i)

        while True:
            try:
                resp = browser.open(url)
                break
            except:
                pass

        soup = BeautifulSoup(resp.read(), 'lxml')

        tmp = {}
        pie = {}

        js_text = soup.find_all('script')
        regex = re.compile("\['[A-Z]',\s\d.\d*\s]")
        conceitos = re.findall(regex, str(js_text[-1]))

        for conceito in conceitos:
            splitted = conceito.split(",")
            grade = splitted[0].replace("'", "").replace("[", "")
            number = splitted[1].replace(" ", '').replace(']', "")
            pie[grade] = number

        tmp['pie'] = pie

        info = soup.find_all('h2')
        try:
            tmp['professor'] = info[0].get_text()
            tmp['cr_aluno'] = info[1].get_text()
            tmp['ca_aluno'] = info[2].get_text()
            tmp['cr_professor'] = info[3].get_text()
            tmp['trancamentos'] = info[4].get_text()
            tmp['reprovacoes'] = info[5].get_text()
            tmp['id'] = i
            tmp['url'] = url
        except:
            continue

        data.append(tmp)

        print "Processando professor: " + str(i) + " " + tmp['professor']

        with open('tmp/help.json', 'w') as file_descriptor:
            json.dump(data, file_descriptor)
        f.close()

if __name__ == "__main__":
    main(sys.argv[1:])
