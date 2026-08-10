import { AppDataSource } from "../../../init";
import { RmsMediaModel } from "../models/RmsMediaModel";

export class RmsMediaRepository {

    private repository =
        AppDataSource.getRepository(RmsMediaModel);

    // =========================================================
    // GET ALL MEDIA
    // =========================================================

    async getAll(): Promise<RmsMediaModel[]> {

        return await this.repository.find({
            order: {
                createdAt: "DESC"
            }
        });
    }


    // =========================================================
    // GET MUSIC
    // =========================================================

    async getMusic(): Promise<RmsMediaModel[]> {

        return await this.repository.find({
            where: {
                mediaType: "music",
                status: "active"
            },
            order: {
                createdAt: "DESC"
            }
        });
    }


    // =========================================================
    // GET VIDEOS
    // =========================================================

    async getVideos(): Promise<RmsMediaModel[]> {

        return await this.repository.find({
            where: {
                mediaType: "video",
                status: "active"
            },
            order: {
                createdAt: "DESC"
            }
        });
    }


    // =========================================================
    // GET MEDIA BY ID
    // =========================================================

    async getById(
        id: number
    ): Promise<RmsMediaModel | null> {

        return await this.repository.findOne({
            where: {
                id
            }
        });
    }


    // =========================================================
    // SEARCH MEDIA
    // =========================================================

    async search(
        searchTerm: string
    ): Promise<RmsMediaModel[]> {

        const query =
            this.repository
                .createQueryBuilder("media")
                .where(
                    "LOWER(media.title) LIKE LOWER(:searchTerm)",
                    {
                        searchTerm: `%${searchTerm}%`
                    }
                )
                .orWhere(
                    "LOWER(media.artist) LIKE LOWER(:searchTerm)",
                    {
                        searchTerm: `%${searchTerm}%`
                    }
                )
                .orWhere(
                    "LOWER(media.album) LIKE LOWER(:searchTerm)",
                    {
                        searchTerm: `%${searchTerm}%`
                    }
                )
                .orWhere(
                    "LOWER(media.category) LIKE LOWER(:searchTerm)",
                    {
                        searchTerm: `%${searchTerm}%`
                    }
                )
                .orderBy(
                    "media.createdAt",
                    "DESC"
                );

        return await query.getMany();
    }


    // =========================================================
    // CREATE MEDIA
    // =========================================================

    async create(
        data: Partial<RmsMediaModel>
    ): Promise<RmsMediaModel> {

        const media =
            this.repository.create(data);

        return await this.repository.save(media);
    }


    // =========================================================
    // UPDATE MEDIA
    // =========================================================

    async update(
        id: number,
        data: Partial<RmsMediaModel>
    ): Promise<RmsMediaModel | null> {

        const media =
            await this.getById(id);

        if (!media) {
            return null;
        }

        Object.assign(
            media,
            data
        );

        return await this.repository.save(media);
    }

    // =========================================================
    // DELETE MEDIA
    // =========================================================

    async delete(
        id: number
    ): Promise<boolean> {

        const result =
            await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }

}
