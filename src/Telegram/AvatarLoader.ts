import {UserProfilePhotos} from "node-telegram-bot-api";
import CacheProvider from "../Cache/CacheProvider";

class AvatarLoader {
    constructor(
        private readonly bot: any, 
        private readonly token: string,
        private readonly cacheProvider : CacheProvider<number, string>
    ) {
    }
    
    public async getAvatarUrl(user_id: number) : Promise<string> {
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
        return `https://api.telegram.org/file/bot${this.token}/${file.file_path}`
    }
}

export default AvatarLoader