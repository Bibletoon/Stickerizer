import MessageTemplate from "./MessageTemplate";
import {Cluster} from "puppeteer-cluster";

let cluster : Cluster;

type MessageParameters = {
    name: String,
    content: String,
    avatarUrl?: String,
    titleColor: String
}

const renderMessage = async (params: MessageParameters) : Promise<Buffer> => {
    if (cluster == null) {
        cluster = cluster = await Cluster.launch({
            concurrency: Cluster.CONCURRENCY_CONTEXT,
            maxConcurrency: 16,
            timeout: 5000,
            puppeteerOptions: {'headless': 'new'}
        })
    }

    const html = MessageTemplate(params);

    const buffer = await cluster.execute({
        html
    }, async ({ page, data }) => {
        const {html} = data;
        await page.setContent(html);
        const element = await page.$('.container')

        if (element == null)
            throw new Error('Invalid selector')

        return await element.screenshot({
            type: 'webp',
            omitBackground: true
        })
    })
    return buffer;
}

export {renderMessage, MessageParameters}