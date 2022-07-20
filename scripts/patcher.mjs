import iconv from 'iconv-lite';
import { Logger } from './logger.mjs';
import { Utils } from './utils.mjs';

const availableLangs = ['en', 'ru', 'de'];
var lang = process.argv && process.argv[2];

if (!availableLangs.includes(lang)) {
    lang = 'en';
}

console.info(`[--- PhotoKanoPatcher: ${lang} ---]`);

const logger = new Logger('patcher.log');

const textPath = './text';
const filesDescCsv=`${textPath}/files.csv`;

function getPatchPath(patch) {
    return `${textPath}/${patch}.csv`;
}

function enPatch(enStr) {
    const enPhrase = Buffer.from(enStr);
    return enPhrase;
}

function ruPatch(ruStr) {
    const cMap = { 
        'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': '{', 'Ж': 'J', 'З': 'Z', 'И': 'I', 'Й': 'ｦ', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N',
        'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'C', 'Ч': 'X', 'Ш': 'W', 'Щ': 'ｫ', 'Ъ': 'ｧ', 'Ы': 'ｨ', 'Ь': 'ｩ',
        'Э': '\\', 'Ю': 'Q', 'Я': 'Y',
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': '}', 'ж': 'j', 'з': 'z', 'и': 'i', 'й': '@', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n',
        'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'x', 'ш': 'w', 'щ': 'ｬ', 'ъ': 'ｪ', 'ы': '&', 'ь': '~',
        'э': '^', 'ю': 'q', 'я': 'y'
    };

    let resultStr = '';

    const codeAbig = 'A'.charCodeAt(0);
    const codeZbig = 'Z'.charCodeAt(0);

    const codeAsmall = 'a'.charCodeAt(0);
    const codeZsmall = 'z'.charCodeAt(0);

    const engBigStart = 'Ａ'.charCodeAt(0);
    const engSmallStart = 'ａ'.charCodeAt(0);

    let prev = '';
    for (let i = 0; i < ruStr.length; i++) {
        const c = ruStr[i];
        const code = ruStr.charCodeAt(i);

        // English characters
        if (code >= codeAbig && code <= codeZbig) {
            resultStr += String.fromCharCode(engBigStart - codeAbig + code);
            continue;
        }

         // Skip char mapping for keyworkd like (\p01)
        if (code >= codeAsmall && code <= codeZsmall && prev !== '\\') {
            resultStr += String.fromCharCode(engSmallStart - codeAsmall + code);
            continue;
        }

        // Mapped char or default
        resultStr += cMap[c] || c;
        prev = c;
    }

    const ruPhrase = Buffer.from(resultStr);
    return ruPhrase;
}

function dePatch(deStr) {
    const cMap = { 
        'Ä': '@', 'Ö': '\\', 'Ü': '^', 'ß': '&',
        'ä': '{', 'ö': '}', 'ü': '~'
    };

    let resultStr = '';

    for (let i = 0; i < deStr.length; i++) {
        const c = deStr[i];
        resultStr += cMap[c] || c;
    }

    const dePhrase = Buffer.from(resultStr);
    return dePhrase;
}

function safeCutBuffer(buffer, safeMSize, encoding) {
    let decodedStr = iconv.decode(buffer, encoding);
    let bufferLength = buffer.length;
    let cuttedBuffer;

    let initial = decodedStr;

    while (bufferLength > safeMSize) {
        decodedStr = decodedStr.slice(0, -1);
        cuttedBuffer = iconv.encode(decodedStr, encoding);
        bufferLength = cuttedBuffer.length;
    }
    
    return cuttedBuffer;
}

async function patchGameFile(patch, encoding, source, savePath) {
    console.log(`Patching: ${patch}...`);
    try {
        const patchData = await Utils.readCsv(getPatchPath(patch));
        const originalData = await Utils.readFile(source);

        // Patching
        for (let i = 0; i < patchData.length; i++) {
            const [offsetStr, maxSize, jp, en, ru, de] = patchData[i];
            const mSize = Number(maxSize);

            let initialPhrase = Buffer.from(jp);
            if (encoding !== 'utf8') {
                initialPhrase = iconv.encode(initialPhrase, encoding);
                if (encoding === 'Shift_JIS') {
                    initialPhrase = Utils.fixShiftJisCarriageReturn(initialPhrase);
                }
            }
            const initialPhraseSize = initialPhrase.length;

            const offset = Number(`0x${offsetStr}`);
            if (isNaN(offset) || offset < 0 || offset >= originalData.length) {
                // Skip
                logger.log('WARN',`Incorrect offset ${offsetStr}!`);
                continue;
            }

            let phrase;
            switch (lang) {
                case 'en':
                    if (!en) { continue; }
                    phrase = enPatch(en);
                    break;

                case 'ru':
                    if (!ru) { continue; }
                    phrase = ruPatch(ru);
                    break;

                case 'de':
                    if (!de) { continue; }
                    phrase = dePatch(de);
                    break;

                default:
                    logger.log('FAIL', 'Not implemented yet!');
                    continue;
            }

            if (encoding !== 'utf8') {
                phrase = iconv.encode(phrase, encoding);
                if (encoding === 'Shift_JIS') {
                    phrase = Utils.fixShiftJisCarriageReturn(phrase);
                }
            }

            if (phrase.length > mSize) {
                // Skip
                logger.log('WARN', `${lang} phrase size at 0x${offsetStr} (${phrase.length}) in ${patch} bigger than max size (${mSize})! Result string will be cutted!`);
                const safeMSize = encoding === 'utf8' ? mSize - 1 : mSize;

                // Cut buffer
                phrase = safeCutBuffer(phrase, safeMSize, encoding);
            }

            if (phrase.length > initialPhraseSize && phrase.length === mSize) {
                logger.log('INFO', `${lang} phrase size at 0x${offsetStr} (${phrase.length}) in ${patch} bigger than initial (${initialPhraseSize}); max size (${mSize})!`);
            }

            // Replace
            Utils.replaceWord(originalData, phrase, offset, initialPhraseSize);
        }

        // Save file after patching
        const sp2 = `patched/${lang}/${savePath}`;
        await Utils.saveBuffer(sp2, originalData);
    } catch (e) {
        logger.log('FAIL', `Failed to patch ${patch} due to error! ${e}`);
    }
}

async function main() {
    let result = 0;
    try {
        const patches = await Utils.readCsv(filesDescCsv);
        console.log('Patches loaded!');

        for (let i = 0; i < patches.length; i++) {
            const [patch, encoding, source, savePath] = patches[i];
            await patchGameFile(patch, encoding, source, savePath);
        }

    } catch (e) {
        logger.log('FAIL', `${e}`);
        result = 1;
    }

    await logger.saveLogs();
    process.exit(result);
}

main();