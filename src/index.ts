import InlineQueryHandler from "./Telegram/InlineQueryHandler";
import {StickerGenerator} from "./Generator/Generator";
import AvatarLoader from "./Telegram/AvatarLoader";
import InMemoryCacheProvider from "./Cache/InMemoryCacheProvider";
const TelegramBot = require("node-telegram-bot-api");
import pino, {Logger} from "pino"
import LocalTimeMeasurer from "./TimeMeasure/LocalTimeMeasurer";

process.env.NTBA_FIX_350 = "1";
const token = process.env.TOKEN;


void async function main() {
    const logger : Logger = pino()
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
