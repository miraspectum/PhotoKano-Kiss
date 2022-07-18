import * as fs from 'fs';

export class Logger {
    constructor(name) {
        this.name = name;
        this.logs = [];
    }

    log(type, msg) {
        type = type.slice(0, 4).toUpperCase();
        const log = `[${type}] ${msg}`;
        this.logs.push(log);
        switch (type) {
            case 'WARN':
                console.warn(log);
                break;
    
            case 'FAIL':
                console.error(log);
                break;
    
            default:
                console.log(log);
        }
    }

    async saveLogs() {
        await fs.promises.mkdir('./logs', { recursive: true });
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream('./logs/' + this.name);
            file.on('error', function(err) { reject(); });
            file.on('finish', function() { resolve(); });
            this.logs.forEach(function(log) { file.write(log + '\n'); });
            file.end();
        });
    }
}