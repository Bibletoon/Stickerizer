// file: state/config.ts
import { fromJSONFile } from "@mrspartak/config";
import * as z from "zod"

const configSchema = z.object({
    bot: z.object({
        token: z.string(),
        bufferChatId: z.number()
    }),
    app: z.object({
        logLevel: z.string().optional().default('info')
    })
})

const readConfig = async (path: string | string[]) => await fromJSONFile({
    path: path,
    schema: configSchema
});

export default readConfig