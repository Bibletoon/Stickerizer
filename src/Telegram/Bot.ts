import {renderMessage} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";
import {InlineQuery, UserProfilePhotos} from "node-telegram-bot-api";
const TelegramBot = require("node-telegram-bot-api");

const createBot = (token: String) => {
    const bot = new TelegramBot(token, {polling: true})

    bot.on('inline_query', async (query: InlineQuery) => {
        console.log(`--- Start processind request ---`)
        const start = performance.now()
        const userProfilePhotos : UserProfilePhotos = await bot.getUserProfilePhotos(query.from.id)

        let avatarUrl: string = '';

        if (userProfilePhotos.total_count > 0) {
            const photo = userProfilePhotos.photos[0][0]
            const file = await bot.getFile(photo.file_id)
            avatarUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
        }

        const avatarLoad = performance.now()
        console.log(`Avatar load took ${avatarLoad - start}`)

        const sticker = await renderMessage({
            name: query.from.first_name,
            content: query.query,
            titleColor: colorsMap[query.from.id % 7],
            avatarUrl: avatarUrl
        })
        const stickerGeneration = performance.now()
        console.log(`Sticker generation took ${stickerGeneration - avatarLoad}`)

        const stickerMessage = await bot.sendSticker(412750554, sticker)
        const stickerSend = performance.now()
        console.log(`Sticker send took ${stickerSend - stickerGeneration}`)

        const queryResult = {
            type: "sticker",
            id: query.id,
            sticker_file_id: stickerMessage.sticker.file_id
        };
        await bot.answerInlineQuery(query.id,[queryResult])

        const final = performance.now()
        console.log(`Query answer took ${final - stickerSend}`)
        console.log(`Total duration ${final - start}`)
        console.log(`--- Finish processing request ---`)
    })

    return bot;
}

export {createBot}