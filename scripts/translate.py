import argostranslate.package, argostranslate.translate

import sys

str_to_translate = sys.argv[1]
from_code = sys.argv[2]
to_code = sys.argv[3]

# Translate
installed_languages = argostranslate.translate.get_installed_languages()
from_lang = list(filter(
	lambda x: x.code == from_code,
	installed_languages))[0]
to_lang = list(filter(
	lambda x: x.code == to_code,
	installed_languages))[0]

translation = from_lang.get_translation(to_lang)
translatedText = translation.translate(str_to_translate)

with open('ptr.txt', 'w', encoding='utf-8') as f:
    f.write(translatedText)