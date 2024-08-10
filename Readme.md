# Stickerizer

Simple Telegram bot for quote sticker generation

### Setup:

1. Create telegram bot and enable InlineMode
2. Prepare configuration in `config.json` file
   * `token` - token from BotFather
   * `bufferChatId` -  chat or user id where bot can write. It will be used to transform image to sticker
3. Start bot via `npm run start`

### Usage:

Type `@YourBotName text` in any chat and bot will generate quote sticker with provided text in inline reply window

![](docs/usage.png)