import {StickerGenerator} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";
import {InlineQuery} from "node-telegram-bot-api";
import AvatarLoader from "./AvatarLoader";
import {Logger} from "pino";

/*
    План:
    * Сделать нормальные замеры времени
    * Сделать трай кетч на хендлер
 */

export default class InlineQueryHandler {
    constructor(
        private readonly bot: any,
        private readonly stickerGenerator: StickerGenerator,
        private readonly avatarLoader: AvatarLoader,
        private readonly logger : Logger
    ) {
        this.bot.on('inline_query', async (query: InlineQuery) => {
            await this.handleInlineQuery(query);
        })
    }

    private async handleInlineQuery(query: InlineQuery): Promise<void> {
        if (!query.query) {
            return
        }
        const logger = this.logger.child({"query_id": query.id})
        logger.info("start handling query from %s", query.from.id, query.query);
        
        try {
            const avatarUrl = await this.avatarLoader.getAvatarUrl(query.from.id);

            const sticker = await this.stickerGenerator.renderMessage({
                name: query.from.first_name,
                content: query.query,
                titleColor: colorsMap[query.from.id % 7],
                avatarUrl: avatarUrl
            })

            const stickerMessage = await this.bot.sendSticker(412750554, sticker)

            const queryResult = {
                type: "sticker",
                id: query.id,
                sticker_file_id: stickerMessage.sticker.file_id
            };
            await this.bot.answerInlineQuery(query.id, [queryResult])
            logger.info("end handling query from %s", query.from.id)
        } catch () {
            lo
        }
        
    }
}