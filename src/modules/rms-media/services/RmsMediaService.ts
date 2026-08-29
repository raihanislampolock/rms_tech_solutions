import { RmsMediaRepository } from "../repositories/RmsMediaRepository";
import { RmsMediaModel } from "../models/RmsMediaModel";
import {
    YouTubeProvider,
    YouTubeSearchResult,
    YouTubeVideoInfo,
    YouTubeQuality,
    YouTubeDownloadResult,
    YouTubeDownloadProgress
} from "../providers/YouTubeProvider";

export class RmsMediaService {


    private repository: RmsMediaRepository;
    private youtubeProvider: YouTubeProvider;

    constructor() {
        this.repository = new RmsMediaRepository();
        this.youtubeProvider = new YouTubeProvider();
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

        if (!id || id <= 0) {
            return null;
        }

        return await this.repository.getById(id);
    }


    // =========================================================
    // SEARCH MEDIA
    // =========================================================

    async search(
        searchTerm: string
    ): Promise<RmsMediaModel[]> {

        const term =
            typeof searchTerm === "string"
                ? searchTerm.trim()
                : "";

        if (!term) {
            return await this.repository.getAll();
        }

        return await this.repository.search(term);
    }


    // =========================================================
    // CREATE MEDIA
    // =========================================================

    async create(
        data: Partial<RmsMediaModel>
    ): Promise<RmsMediaModel> {

        return await this.repository.create(data);
    }


    // =========================================================
    // UPDATE MEDIA
    // =========================================================

    async update(
        id: number,
        data: Partial<RmsMediaModel>
    ): Promise<RmsMediaModel | null> {

        if (!id || id <= 0) {
            return null;
        }

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

        if (!id || id <= 0) {
            return false;
        }

        return await this.repository.delete(id);
    }


    // =========================================================
    // YOUTUBE SEARCH
    // =========================================================

    async youtubeSearch(
        searchTerm: string
    ): Promise<YouTubeSearchResult[]> {

        const term =
            typeof searchTerm === "string"
                ? searchTerm.trim()
                : "";

        if (!term) {
            return [];
        }

        return await this.youtubeProvider.search(
            term
        );
    }


    // =========================================================
    // YOUTUBE VIDEO
    // =========================================================

    async youtubeVideo(
        videoId: string
    ): Promise<YouTubeVideoInfo | null> {

        const id =
            typeof videoId === "string"
                ? videoId.trim()
                : "";

        if (!id) {
            return null;
        }

        return await this.youtubeProvider.getVideo(
            id
        );
    }


    // =========================================================
    // YOUTUBE QUALITIES
    // =========================================================

    async youtubeQualities(
        videoId: string
    ): Promise<YouTubeQuality[]> {

        const id =
            typeof videoId === "string"
                ? videoId.trim()
                : "";

        if (!id) {
            return [];
        }

        return await this.youtubeProvider.getQualities(
            id
        );
    }


    // =========================================================
    // YOUTUBE DOWNLOAD
    // =========================================================

    async youtubeDownload(
        data: {
            videoId: string;
            type: "audio" | "video";
            quality: string;
            onProgress?: (progress: YouTubeDownloadProgress) => void;
        }
    ): Promise<YouTubeDownloadResult> {

        if (!data.videoId) {

            throw new Error(
                "YouTube video ID is required"
            );
        }

        return await this.youtubeProvider.download(
            {
                videoId:
                    data.videoId.trim(),

                type:
                    data.type === "audio"
                        ? "audio"
                        : "video",

                quality:
                    data.quality || "best",

                onProgress:
                    data.onProgress
            }
        );
    }
}