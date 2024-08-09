import {StickerGenerator} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";
import {InlineQuery} from "node-telegram-bot-api";
import AvatarLoader from "./AvatarLoader";

/*
    План:
    * Сделать нормальное логирование
    * Сделать нормальные замеры времени
    * Сделать трай кетч на хендлер
 */

export default class InlineQueryHandler {
    constructor(
        private readonly bot: any,
        private readonly stickerGenerator: StickerGenerator,
        private readonly avatarLoader: AvatarLoader
    ) {
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

        const avatarUrl = await this.avatarLoader.getAvatarUrl(query.from.id);
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
        await this.bot.answerInlineQuery(query.id, [queryResult])

        const final = performance.now()
        console.log(`Query answer took ${final - stickerSend}`)
        console.log(`Total duration ${final - start}`)
        console.log(`--- Finish processing request ---`)
    }
}