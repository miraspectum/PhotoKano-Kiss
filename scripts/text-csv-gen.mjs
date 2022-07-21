import * as fs from 'fs';
import iconv from 'iconv-lite';
import { basename, dirname } from 'path';
import { Logger } from './logger.mjs';
import { Utils } from './utils.mjs';

const logger = new Logger('text-csv-gen.log');
const filesDescCsv = './text/files.csv';
const originalPath = './original/extracted';

function getExpectedPhraseLength(data, offset) {
    if (offset <= 3) { return null; }
    let result = 0;
    let i = 1;
    while (i < 5) {
        result += data[offset - i] << i * 8;
        i++;
    }
    return result;
}

async function savePatchFile(filePath, phrasePatches) {
    const csvPath = `./text/${filePath}.csv`;

    try {
        if (await Utils.isExists(csvPath)) {
            const oldCsv = await Utils.readCsv(csvPath);
            phrasePatches.forEach(phrase => {
                if (!oldCsv.find(row => row[0] === phrase[0])) {
                    oldCsv.push([...phrase, '', '', '']);
                }
            });

            await Utils.saveLines(csvPath, oldCsv.map(row => `${row[0]},${row[1]},\"${row[2]}\",\"${row[3]}\",\"${row[4]}\",\"${row[5]}\"`));
        } else {
            await fs.promises.mkdir(dirname(csvPath), { recursive: true });
            await Utils.saveLines(csvPath, phrasePatches.map(row => `${row[0]},${row[1]},\"${row[2]}\",\"\",\"\",\"\"`));
        }
    } catch (e) {
        throw `Unable to save patch file ${filePath}!`;
    }
}

function getPhrases(text, fileName) {
    const regExp = /(([a-z0-9]+)?([一-龯ぁ-ゟゞァ-・。、ヽヾ゛゜ー０-９Ａ-ｚ\n ～…！？「」　々『』（）※：／♪．”“－＆＞％【】＋)―÷Ё＝?!≧]+[\\A-z0-9:\. \n　,、]*[一-龯ぁ-ゟゞァ-・。、ヽヾ゛゜ー０-９Ａ-ｚ\n ～…！？「」　々『』（）※：／♪．”“－＆＞％【】＋)―÷Ё＝?!≧]+){2,}([a-z]+)?)/gi;

    // Matched phrases
    let phrases = text.match(regExp);

    if (!phrases || phrases.length < 1) {
        return null;
    }

    const exceptions = [
        {
            file: 'ID06891',
            phrases: [
`（“ａ2＋ｂ2＋ｃ2≧ａｂ＋ｂ……”
　俺を殺す気か？）`]
        },
        // Iconv can`t decode ¥ symbol (https://github.com/ashtuchkin/iconv-lite/issues/218)
//         {
//             file: 'ID04714',
//             phrases: [
// `「いつも一緒…か、まいったな。
// 　¥¥¥つき合ってんの？」`
//             ]
//         }
    ];

    const fileExceptions = exceptions.find(ex => fileName === ex.file);
    if (fileExceptions) {
        phrases.push(...fileExceptions.phrases);
    }
    
    // Remove substrings
    phrases = phrases.filter(f => {
        return !phrases.find(f2 => f2 !== f && f2.includes(f));
    });

    return phrases;
}

async function getGscFile(filePath) {
    let data;
    try {
        data = await Utils.readFile(filePath);
    } catch (e) {
        throw e;
    }

    // Check magick word
    const magickWord = Uint8Array.prototype.slice.call(data, 0, 4);
    if (magickWord.toString() !== 'GSC2') {
        throw 'wrongFileFormat';
    }

    return data;
}

async function scanFile(filePath) {

    const fileName = basename(filePath);

    let data = await getGscFile(filePath);

    let decoded = iconv.decode(data, 'Shift_JIS');

    const phrases = getPhrases(decoded, fileName);

    if (!phrases) {
        // logger.log('INFO', `Nothing to parse in ${filePath}!`);
        return undefined;
    }

    const phrasePatches = [];
    for (let i = 0; i < phrases.length; i++) {
        const phrase = phrases[i];

        let encoded = iconv.encode(phrase, 'Shift_JIS');
        encoded = Utils.fixShiftJisCarriageReturn(encoded);

        const phraseIndex = data.indexOf(encoded);
        const expectedPhraseLength = getExpectedPhraseLength(data, phraseIndex);

        // Skip unknown phrase format
        if (data[phraseIndex - 1] !== 0) {
            logger.log('SKIP', `Phrase "${phrase}" at 0x${phraseIndex.toString(16)} in ${filePath} skipped!`);
            continue;
        }

        // Notify about different sizes
        if (encoded.length !== expectedPhraseLength) {
            logger.log('WARN', `Size of phrase ${phrase} at 0x${phraseIndex.toString(16)} in ${filePath} (${encoded.length}) and exptected (${expectedPhraseLength}) not matched!`);
            continue;
        }

        // Add to list
        let offsetStr = phraseIndex.toString(16);
        offsetStr = '0'.repeat(8 - offsetStr.length) + offsetStr;
        phrasePatches.push([offsetStr, encoded.length.toString(),`${phrase}`]);
    }

    if (phrasePatches.length > 0) {
        const patchPath = filePath.replace(`${originalPath}/`, '');

        await savePatchFile(patchPath, phrasePatches);

        return [patchPath, 'Shift_JIS', filePath, `cpks/${patchPath}`];
    }

    return undefined;
}

async function processDir(path) {
    const files = await Utils.readDir(path);
    const patches = [];

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const filePath = `${path}/${file}`;
        const isFileDir = await Utils.isDir(filePath);

        if (isFileDir) {
            patches.push(...(await processDir(filePath)));
        } else {
            try {
                const patch = await scanFile(filePath);
                if (patch !== undefined) {
                    patches.push(patch);
                }
            } catch (e) {
                if (e !== 'wrongFileFormat') {
                    logger.log('FAIL', `Failed to parse file ${filePath} due to error! ${e}`);
                }
            }
        }
    }

    return patches;
}


async function updatePatchList(patches) {
    if (await Utils.isExists(filesDescCsv)) {
        const oldCsv = await Utils.readCsv(filesDescCsv);
        patches.forEach(patch => {
            if (!oldCsv.find(row => row[0] === patch[0])) {
                oldCsv.push(patch);
            }
        });

        await Utils.saveLines(filesDescCsv, oldCsv.map(row => row.join(',')));
    } else {
        await Utils.saveLines(filesDescCsv, patches.map(row => row.join(',')));
    }
}

async function main() {
    let result = 0;
    try {     
        const patches = await processDir(originalPath);
        //const patches = [await scanFile('./original/extracted/00_GMV/ID06602')];

        await updatePatchList(patches);
    } catch (e) {
        logger.log('FAIL', `${e}`);
        result = 1;
    }

    await logger.saveLogs();
    process.exit(result);
}

main();