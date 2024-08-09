import {StickerGenerator} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";
import {InlineQuery, UserProfilePhotos} from "node-telegram-bot-api";
const TelegramBot = require("node-telegram-bot-api");

/*
    План:
    * Сделать нормальное ООП
    * Докинуть кешей на аватарку
    * Исправить сообщение о загрузке файла
    * Сделать нормальное логирование
 */

class Bot {
    private readonly bot : any;
    
    constructor(private readonly token: String, private readonly stickerGenerator: StickerGenerator) {
        this.bot = new TelegramBot(token, {
            polling: true,
            filepath: false
        }) 
        
        this.bot.on('inline_query', async (query: InlineQuery) => {
            console.log("inline_query", query);
            await this.handleInlineQuery(query);
        })
    }
    
    private async handleInlineQuery(query: InlineQuery): Promise<void> {
        if (!query.query) {
            return
        }

        console.log(`--- Start processind request ---`)
        const start = performance.now()
        const userProfilePhotos : UserProfilePhotos = await this.bot.getUserProfilePhotos(query.from.id)

        let avatarUrl: string = '';

        if (userProfilePhotos.total_count > 0) {
            const photo = userProfilePhotos.photos[0][0]
            const file = await this.bot.getFile(photo.file_id)
            avatarUrl = `https://api.telegram.org/file/bot${this.token}/${file.file_path}`
        }

        const avatarLoad = performance.now()
        console.log(`Avatar load took ${avatarLoad - start}`)

        const sticker = await this.stickerGenerator.renderMessage({
            name: query.from.first_name,
            content: query.query,
            titleColor: colorsMap[query.from.id % 7],
            avatarUrl: avatarUrl
        })
        const stickerGeneration = performance.now()
        console.log(`Sticker generation took ${stickerGeneration - avatarLoad}`)

        const stickerMessage = await this.bot.sendSticker(412750554, sticker)
        const stickerSend = performance.now()
        console.log(`Sticker send took ${stickerSend - stickerGeneration}`)

        const queryResult = {
            type: "sticker",
            id: query.id,
            sticker_file_id: stickerMessage.sticker.file_id
        };
        await this.bot.answerInlineQuery(query.id,[queryResult])

        const final = performance.now()
        console.log(`Query answer took ${final - stickerSend}`)
        console.log(`Total duration ${final - start}`)
        console.log(`--- Finish processing request ---`)
    }
}

export {Bot}