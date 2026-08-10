import {MessageParameters} from "../Generator/Generator";
import colorsMap from "../Styles/ColorsMap";

const SYNTHETIC_AVATAR_DATA_URI =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

const shortNoAvatar: MessageParameters = {
    name: "Alice",
    content: "Hi there!",
    titleColor: colorsMap[0]
}

const shortWithAvatar: MessageParameters = {
    name: "Bob",
    content: "Hi there!",
    avatarUrl: SYNTHETIC_AVATAR_DATA_URI,
    titleColor: colorsMap[1]
}

const longWithAvatar: MessageParameters = {
    name: "Carol",
    content: "This is a much longer message meant to exercise text wrapping and the bubble's layout with a larger amount of content inside it, similar to what a verbose user might type into an inline query.",
    avatarUrl: SYNTHETIC_AVATAR_DATA_URI,
    titleColor: colorsMap[2]
}

const scenarios: {name: string, params: MessageParameters}[] = [
    {name: "short-no-avatar", params: shortNoAvatar},
    {name: "short-with-avatar", params: shortWithAvatar},
    {name: "long-with-avatar", params: longWithAvatar}
]

export {scenarios}
