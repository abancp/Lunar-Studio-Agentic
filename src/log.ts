import winston from 'winston';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine log directory based on OS
const getLogDirectory = () => {
    const homeDir = os.homedir();
    let logDir;

    if (process.platform === 'win32') {
        logDir = path.join(homeDir, 'AppData', 'Local', 'LunarStudio', 'logs');
    } else if (process.platform === 'darwin') {
        logDir = path.join(homeDir, 'Library', 'Logs', 'LunarStudio');
    } else {
        // Linux and others
        logDir = path.join(homeDir, '.local', 'share', 'lunarstudio', 'logs');
    }

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    return logDir;
};

const logDir = getLogDirectory();
const logFile = path.join(logDir, 'app.log');

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
        // Write all logs with importance level of `info` or less to `app.log`
        new winston.transports.File({ filename: logFile }),
    ],
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
    }));
}

export const getLogPath = () => logFile;
