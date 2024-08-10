import InlineQueryHandler from "./Telegram/InlineQueryHandler";
import {StickerGenerator} from "./Generator/Generator";
import AvatarLoader from "./Telegram/AvatarLoader";
import InMemoryCacheProvider from "./Cache/InMemoryCacheProvider";
import pino, {Logger} from "pino"
import LocalTimeMeasurer from "./TimeMeasure/LocalTimeMeasurer";

const TelegramBot = require("node-telegram-bot-api");

process.env.NTBA_FIX_350 = "1";
const token : string = process.env.TOKEN || '';

void async function main() {
    const logger : Logger = pino()
    logger.level = process.env.LOG_LEVEL || 'info'
    const stickerGenerator = await StickerGenerator.create();
    const bot = new TelegramBot(token, {
        polling: true,
        filepath: false
    })
    const cache = new InMemoryCacheProvider<number, string>()
    const avatarLoader = new AvatarLoader(bot, token, cache);
    
    const handler = new InlineQueryHandler(
        bot, 
        stickerGenerator, 
        avatarLoader, 
        logger, 
        () => new LocalTimeMeasurer(logger))
    logger.info("Bot started") 
}()
