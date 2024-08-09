import MessageTemplate from "./MessageTemplate";
import {Cluster} from "puppeteer-cluster";

type MessageParameters = {
    name: String,
    content: String,
    avatarUrl?: String,
    titleColor: String
}

class StickerGenerator {
    private cluster: Cluster;

    constructor(cluster: Cluster) {
        this.cluster = cluster;
    }

    public static async create(): Promise<StickerGenerator> {
        const cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 16,
            timeout: 5000,
            puppeteerOptions: {'headless': 'new'}
        })

        return new StickerGenerator(cluster)
    }

    public async renderMessage(params: MessageParameters): Promise<Buffer> {
        const html = MessageTemplate(params);

        return await this.cluster.execute({
            html
        }, async ({page, data}) => {
            const {html} = data;
            await page.setContent(html);
            const element = await page.$('.container')

            if (element == null)
                throw new Error('Invalid selector')

            return await element.screenshot({
                type: 'webp',
                omitBackground: true
            })
        });
    }
}

export {StickerGenerator, MessageParameters}