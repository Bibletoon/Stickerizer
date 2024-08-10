import InlineQueryHandler from "./Telegram/InlineQueryHandler";
import {StickerGenerator} from "./Generator/Generator";
import AvatarLoader from "./Telegram/AvatarLoader";
import InMemoryCacheProvider from "./Cache/InMemoryCacheProvider";
import pino, {Logger} from "pino"
import LocalTimeMeasurer from "./TimeMeasure/LocalTimeMeasurer";
import readConfig from "./Configuration/Config";

const TelegramBot = require("node-telegram-bot-api");

process.env.NTBA_FIX_350 = "1";

void async function main() {
    const config = await readConfig(["config.json", "config.secrets.json"])
    
    const logger : Logger = pino()
    logger.level = config.app.logLevel;
    const stickerGenerator = await StickerGenerator.create();
    const bot = new TelegramBot(config.bot.token, {
        polling: true,
        filepath: false
    })
    const cache = new InMemoryCacheProvider<number, string>()
    const avatarLoader = new AvatarLoader(bot, config.bot.token, cache);
    
    const handler = new InlineQueryHandler(
        bot, 
        stickerGenerator, 
        avatarLoader, 
        logger, 
        () => new LocalTimeMeasurer(logger))
    logger.info("Bot started") 
}()
