import argostranslate.package, argostranslate.translate
from flask import Flask, request, json

installed_languages = argostranslate.translate.get_installed_languages()

api = Flask(__name__)

@api.route('/translate', methods=['POST'])
def get_companies():
	content = request.json

	from_lang = list(filter(
		lambda x: x.code == content['from'],
		installed_languages))[0]
	to_lang = list(filter(
		lambda x: x.code == content['to'],
		installed_languages))[0]

	translation = from_lang.get_translation(to_lang)

	print(content)
	return translation.translate(content['text'])

if __name__ == '__main__':
    api.run()