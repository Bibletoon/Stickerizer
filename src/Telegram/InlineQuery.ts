type InlineQuery = {
    id: string,
    from: QueryAuthor,
    chat_type: string,
    query: string,
    offset: string
}

type QueryAuthor = {
    id: number,
    is_bot: boolean,
    first_name: string,
    username: string,
    language_code: string,
    is_premium: boolean
}

export {InlineQuery}