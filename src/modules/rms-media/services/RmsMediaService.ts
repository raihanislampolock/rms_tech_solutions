import { RmsMediaModel } from "../models/RmsMediaModel";
import { RmsMediaRepository } from "../repositories/RmsMediaRepository";

export class RmsMediaService {

    private repository: RmsMediaRepository;

    constructor() {
        this.repository =
            new RmsMediaRepository();
    }


    // =========================================================
    // GET ALL MEDIA
    // =========================================================

    async getAll(): Promise<RmsMediaModel[]> {

        return await this.repository.getAll();
    }


    // =========================================================
    // GET MUSIC
    // =========================================================

    async getMusic(): Promise<RmsMediaModel[]> {

        return await this.repository.getMusic();
    }


    // =========================================================
    // GET VIDEOS
    // =========================================================

    async getVideos(): Promise<RmsMediaModel[]> {

        return await this.repository.getVideos();
    }


    // =========================================================
    // GET MEDIA BY ID
    // =========================================================

    async getById(
        id: number
    ): Promise<RmsMediaModel | null> {

        return await this.repository.getById(id);
    }


    // =========================================================
    // SEARCH MEDIA
    // =========================================================

    async search(
        searchTerm: string
    ): Promise<RmsMediaModel[]> {

        return await this.repository.search(
            searchTerm
        );
    }


    // =========================================================
    // CREATE MEDIA
    // =========================================================

    async create(
        data: Partial<RmsMediaModel>
    ): Promise<RmsMediaModel> {

        return await this.repository.create(
            data
        );
    }


    // =========================================================
    // UPDATE MEDIA
    // =========================================================

    async update(
        id: number,
        data: Partial<RmsMediaModel>
    ): Promise<RmsMediaModel | null> {

        return await this.repository.update(
            id,
            data
        );
    }


    // =========================================================
    // DELETE MEDIA
    // =========================================================

    async delete(
        id: number
    ): Promise<boolean> {

        return await this.repository.delete(
            id
        );
    }
}

