import {UserProfilePhotos} from "node-telegram-bot-api";
import CacheProvider from "../Cache/CacheProvider";
import fetch from "node-fetch";

class AvatarLoader {
    constructor(
        private readonly bot: any, 
        private readonly token: string,
        private readonly cacheProvider : CacheProvider<number, string>
    ) {
    }
    
    public async getAvatarBase64(user_id: number) : Promise<string> {
        let avatar = this.cacheProvider.get(user_id)
        if (avatar == null) {
            avatar = await this.loadAvatar(user_id)
            this.cacheProvider.set(user_id, avatar)
        }
        
        return avatar
    }
    
    private async loadAvatar(user_id: number): Promise<string> {
        const userProfilePhotos : UserProfilePhotos = await this.bot.getUserProfilePhotos(user_id)
        
        if (userProfilePhotos.total_count == 0) {
            return ''
        }

        const photo = userProfilePhotos.photos[0][0]
        const file = await this.bot.getFile(photo.file_id)
        const fileUrl = `https://api.telegram.org/file/bot${this.token}/${file.file_path}`

        try {
            const response = await fetch(fileUrl)
            const contentType = response.headers.get('content-type') ?? 'image/jpeg'
            const buffer = await response.buffer()
            return `data:${contentType};base64,${buffer.toString('base64')}`
        } catch {
            return ''
        }
    }
}

export default AvatarLoader