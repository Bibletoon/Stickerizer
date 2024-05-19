type UserProfilePhotos = {
    total_count: number,
    photos: Photo[][]
}

type Photo = {
    file_id: string,
    file_unique_id: string,
    file_size: number,
    file_path: string
}

export {UserProfilePhotos}