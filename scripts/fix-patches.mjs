// My fail -____- Try to fix it...
// Yeah! I fixed it! Use this if csv is corrupted!

import { Utils } from "./utils.mjs";

const start = 6600;
const end = 6699;

async function main() {
    for (let i = start; i <= end; i++) {
        const file = './text/ID0' + i + '.csv';

        const fileData = await Utils.readFile(file);
        const fileStr = fileData.toString();

        const regExp = /[a-f0-9]{8},[0-9]+,".*",".*",".*",".*"/gi;
        const patches = fileStr.match(regExp);

        if (!patches) {
            console.log(file);
            continue;
        }

        const updated = [];

        patches.forEach(p => {
            const regExp2 = /([a-f0-9]{8}),([0-9]+),(".*"),(".*"),".*",".*"/;
            let en = p.match(regExp2)[4];

            if (!en) { 
                updated.push(p);
            }

            const startIndex = p.indexOf(en);
            const endIndex = startIndex + en.length;

            en = en.replace(/"/gi, '').replace(/\.\.\./gi, '…');
            updated.push(p.slice(0, startIndex) + `"${en}"` + p.slice(endIndex));
        });

        await Utils.saveLines(file, updated);
    }

}

main();