import { v2 } from '@google-cloud/translate';
import { Utils } from './utils.mjs';
import { Logger } from './logger.mjs';

const logger = new Logger('auto-translate.log');
const filesDescCsv = './text/files.csv';

const availableLangs = ['en'];

const CHAR_LIMIT = 450000;
let charCounter = 0;

async function translatePhrase(jp, lang) {
    const translate = new v2.Translate();
    let [translation] = await translate.translate(jp, lang);
    let result = Array.isArray(translation) ? translation[0] : translation;
    result = result.replace(/\"/gi, '').replace(/\.\.\./gi, '…');
    logger.log('INFO', `Translated ${jp} - ${result}`);
    return result;
}

async function savePatch(patch, translated) {
    await Utils.saveLines(`./text/${patch}.csv`, translated.map(row => `${row[0]},${row[1]},\"${row[2]}\",\"${row[3]}\",\"${row[4]}\",\"${row[5]}\"`));
}

async function translatePatch(patch) {
    logger.log('INFO', `Translating ${patch}`);
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

                if (charCounter >= CHAR_LIMIT) {
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
                        unsaved: translated
                    };
                }
            }
        }

        translated.push([offsetStr, maxSize, jp, phraseData.en, phraseData.ru, phraseData.de]);
    }

    await savePatch(patch, translated);
}

async function main() {
    let result = 0;
    try {
        const patches = await Utils.readCsv(filesDescCsv);
        

        for (let i = 0; i < patches.length; i++) {
            const [patch, ...other] = patches[i];
            if (!patch.includes('ID0660')) { continue; }
            await translatePatch(patch);
        }

        console.log(charCounter);

    } catch (e) {
        console.log(e);
        if (e.unsaved && e.unsaved.length > 0) {
            await savePatch(patch, e.unsaved);
        }

        logger.log('FAIL', `${e.error || e}`);
        result = 1;
    }

    await logger.saveLogs();
    process.exit(result);
}

main();
