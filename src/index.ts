import {createBot} from "./Telegram/Bot";
import {MessageParameters, renderMessage} from "./Generator/Generator";
import colorsMap from "./Styles/ColorsMap";

const token = '7169711607:AAHotQQ1kDkOKB_nvHBfc8Bk1Fg_O7TGp_A'

let bot = createBot(token)
console.log("Bot started")
// let message : MessageParameters = {
//     titleColor: colorsMap[6],
//     content: "Aboba",
//     name: "Bibletoon"
// }
//
// renderMessage(message)