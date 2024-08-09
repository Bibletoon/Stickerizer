import {Bot} from "./Telegram/Bot";
import {StickerGenerator} from "./Generator/Generator";

process.env.NTBA_FIX_350 = "1";
const token = '7169711607:AAHotQQ1kDkOKB_nvHBfc8Bk1Fg_O7TGp_A'

void async function main() {
    const stickerGenerator = await StickerGenerator.create();
    let bot = new Bot(token, stickerGenerator)
    console.log("Bot started")    
}()
