import {StickerGenerator} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";
import {InlineQuery} from "node-telegram-bot-api";
import AvatarLoader from "./AvatarLoader";
import {Logger} from "pino";
import TimeMeasurer from "../TimeMeasure/TimeMeasurer";

export default class InlineQueryHandler {
    constructor(
        private readonly bot: any,
        private readonly stickerGenerator: StickerGenerator,
        private readonly avatarLoader: AvatarLoader,
        private readonly logger : Logger,
        private readonly measurerFactory: () => TimeMeasurer
    ) {
        this.bot.on('inline_query', async (query: InlineQuery) => {
            await this.handleInlineQuery(query);
        })
    }

    private async handleInlineQuery(query: InlineQuery): Promise<void> {
        if (!query.query) {
            return
        }
        const logger = this.logger.child({"query_id": query.id, "from_id": query.from.id})
        const timeMeasurer = this.measurerFactory()
        timeMeasurer.SetScope({"query_id": query.id, "from_id": query.from.id})
        logger.info("start handling query");
        
        try {
            const avatarUrl = await timeMeasurer.MeasureAsync("avatarLoad", async () => 
                this.avatarLoader.getAvatarUrl(query.from.id)
            )

            const sticker = await timeMeasurer.MeasureAsync("stickerGeneration", async () =>
                    this.stickerGenerator.renderMessage({
                    name: query.from.first_name,
                    content: query.query,
                    titleColor: colorsMap[query.from.id % 7],
                    avatarUrl: avatarUrl})
            )

            const stickerMessage = await timeMeasurer.MeasureAsync("stickerMessage", async () => 
                this.bot.sendSticker(412750554, sticker)
            )

            const queryResult = {
                type: "sticker",
                id: query.id,
                sticker_file_id: stickerMessage.sticker.file_id
            };
            
            await timeMeasurer.MeasureAsync("queryAnswer", async () => 
                 this.bot.answerInlineQuery(query.id, [queryResult])
            )
            
            logger.info("end handling query from %s", query.from.id)
        } catch (e) {
            logger.error(e, "error handling query")
        }
        
    }
}