import { v2 } from '@google-cloud/translate';
import { Utils } from './utils.mjs';
import { Logger } from './logger.mjs';

const logger = new Logger('auto-translate.log');
const filesDescCsv = './text/files.csv';

const availableLangs = ['en', 'ru', 'de'];

const CHAR_LIMIT = 300000;
let charCounter = 0;

const phrasesByLangCounter = {};
availableLangs.forEach(lang => phrasesByLangCounter[lang] = 0);

const translateSystem = 'argos'; // 'google'

function customTextSplitter(text, maxLineLength = 50) {
    const words = text.replace(/[\n\r]/gi, '').split(' ');
    const lines = [];

    let line = '';
    for (const word of words) {
        const tmpLine = [line, word].join(' ');

        if (tmpLine.length > maxLineLength) {
            lines.push(line.trim());
            line = word;
            continue;
        }

        line = tmpLine;
    }

    if (line !== '') {
        lines.push(line.trim());
    }

    return lines.join('\n');
}

async function translatePhrase(jp, lang) {
    const startTime = process.hrtime();
    let result;
    switch (translateSystem) {
        case 'google':
        {
            const translate = new v2.Translate();
            let [translation] = await translate.translate(jp, lang);
            result = Array.isArray(translation) ? translation[0] : translation;
        }

        case 'argos':
        {
            // We need to remove carriage return for execute command
            // But we can write method to split text on lines
            // Can`t return result here, problem with encoding (I can`t fix this...)
            //await Utils.executeCmd(`set ARGOS_DEVICE_TYPE=auto | python ./scripts/translate.py \"${jp.replace(/\n/gi, '')}\" ja ${lang}`);
            result = await Utils.httpPost('http://localhost:5000/translate', {
                text: jp.replace(/\n/gi, ''),
                from: 'ja',
                to: lang
            });
            if (!result) {
                return '';
            }
            result = customTextSplitter(result);
        }
    }

    result = result.replace(/\"/gi, '').replace(/\.\.\./gi, '…');
    const endTime = process.hrtime(startTime);
    logger.log('INFO', `Translated ${jp} - ${result}; Time: ${endTime.join(',')}s`);
    phrasesByLangCounter[lang]++;
    return result;
}

async function savePatch(patch, translated) {
    await Utils.saveLines(`./text/${patch}.csv`, translated.map(row => `${row[0]},${row[1]},\"${row[2]}\",\"${row[3]}\",\"${row[4]}\",\"${row[5]}\"`));
}

async function translatePatch(patch) {
    logger.log('INFO', `Translating ${patch}`);
    const startTime = process.hrtime();
    const phrases = await Utils.readCsv(`./text/${patch}.csv`);
    const translated = [];

    for (let i = 0; i < phrases.length; i++) {
        const [offsetStr, maxSize, jp, en, ru, de] = phrases[i];

        const phraseData = {
            en, ru, de
        };

        // Better to translate manualy
        const regExp = /[A-a0-9.,!\?]/gi;
        if (regExp.test(jp)) {
            continue;
        }

        const jpCharCount = jp.length;

        // Translate
        for (const lang of availableLangs) {
            if (!phraseData[lang]) {
                charCounter += jpCharCount;

                if (charCounter >= CHAR_LIMIT && translateSystem === 'google') {
                    throw {
                        error: 'Character limit exceeded!',
                        unsaved: translated
                    };
                }

                try {
                    phraseData[lang] = await translatePhrase(jp, lang);
                } catch (e) {
                    throw {
                        error: e,
                        patch: patch,
                        jp: jp,
                        unsaved: translated
                    };
                }
            }
        }

        translated.push([offsetStr, maxSize, jp, phraseData.en, phraseData.ru, phraseData.de]);
    }

    await savePatch(patch, translated);
    const endTime = process.hrtime(startTime);
    logger.log('INFO', `${patch} translated! Time: ${endTime.join(',')}s`);
}

async function main() {
    let result = 0;

    try {
        const startTime = process.hrtime();
        const patches = await Utils.readCsv(filesDescCsv);
        
    
        for (let i = 0; i < patches.length; i++) {
            const [patch, ...other] = patches[i];
            try {
                if (!patch.includes('ID02')) { continue; }
                await translatePatch(patch);
            } catch (e) {
                console.log(e);
                if (e.unsaved && e.unsaved.length > 0) {
                    await savePatch(patch, e.unsaved);
                }
            }
        }
    
        logger.log('INFO', `Chars : ${charCounter}`);
        logger.log('INFO', `PhrasesByLang: ${Object.entries(phrasesByLangCounter).map(entry => `${entry[0]}: ${entry[1]} `)}`);
        const endTime = process.hrtime(startTime);
        logger.log('INFO', `Total time: ${endTime.join(',')}s`);
    } catch (e) {
        logger.log('FAIL', `${e.error || e}`);
        result = 1;
    }

    await logger.saveLogs();
    process.exit(result);
}

main();
