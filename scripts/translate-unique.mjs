import { Utils } from './utils.mjs';
import { Logger } from './logger.mjs';

const logger = new Logger('translate-unique.log');

const textPath = './text';
const uniquePath=`${textPath}/unique.csv`;

const availableLangs = ['en', 'ru', 'de'];
const langIndices = { en: 1, ru: 2, de: 3 };

const apiUrl = 'http://localhost:5000/translate';

const phrasesByLangCounter = {};
availableLangs.forEach(lang => phrasesByLangCounter[lang] = 0);

async function translatePhrase(jp, lang) {
    const startTime = process.hrtime();
    let result = await Utils.httpPost(apiUrl, {
                text: jp.replace(/\n/gi, ''),
                from: 'ja',
                to: lang
            });

    result = result || '';
    result = result.replace(/\"/gi, '').replace(/\.\.\./gi, '…');
    result = Utils.customTextSplitter(result);

    if (!result) {
        logger.log('WARN', `Can't to tranalte "${jp}" to ${lang}!`);
        return '';
    }
    
    const endTime = process.hrtime(startTime);
    logger.log('INFO', `Translated "${jp}" - "${result}"; Time: ${endTime.join(',')}s`);
    phrasesByLangCounter[lang]++;
    return result;
}

async function translateUniqueData(unique) {
    const [jp, en, ru, de] = unique;

    const phraseData = {
        en, ru, de
    };

    // Better to translate manualy
    const regExp = /[A-a0-9.,!\?]/gi;
    if (regExp.test(jp)) {
        logger.log('WARN', `Better to translate manualy "${jp}"!`);
        return;
    }

    // Translate
    for (const lang of availableLangs) {
        if (!phraseData[lang]) {
            try {
                phraseData[lang] = await translatePhrase(jp, lang);
            } catch (e) {
                logger.log('FAIL', `Failed to translate unique ${jp} due to error! ${e}`);
            }
        }
        unique[langIndices[lang]] = phraseData[lang];
    }
}

async function main() {
    let result = 0;

    try {
        const startTime = process.hrtime();
        const uniqueList = await Utils.readCsv(uniquePath);

        if (!uniqueList) {
            throw 'Unique list can`t be empty!';
        }
    
        for (let i = 0; i < uniqueList.length; i++) {
            try {
                await translateUniqueData(uniqueList[i]);
                console.log(`Progress: ${i}/${uniqueList.length}`);
            } catch (e) {
                logger.log('FAIL', e);
            }
        }

        await Utils.saveLines(uniquePath, uniqueList.map(row => `\"${row[0]}\",\"${row[1]}\",\"${row[2]}\",\"${row[3]}\"`));
    
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