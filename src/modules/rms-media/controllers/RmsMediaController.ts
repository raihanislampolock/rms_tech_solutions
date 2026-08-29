import { Controller } from "../../../core/Controller";
import { NextFunc, HttpRequest, HttpResponse } from "../../../core/Types";
import { RmsMediaService } from "../services/RmsMediaService";
import { mediaUpload } from "../../../middlewares/mediaUpload";
import fs from "fs";
import path from "path";


export class RmsMediaController extends Controller {

    private rmsMediaService: RmsMediaService;

    private auth = {
        private: true,
        public: false
    };


    constructor() {
        super();

        this.rmsMediaService =
            this.getService("RmsMediaService");
    }


    // =========================================================
    // REGISTER ROUTES
    // =========================================================

    public onRegister(): void {

        // -----------------------------------------------------
        // RMS MEDIA PAGES
        // -----------------------------------------------------

        this.onGet(
            "/rms-media",
            [],
            this.auth.private,
            this.index
        );

        this.onGet(
            "/rms-media/music",
            [],
            this.auth.private,
            this.music
        );

        this.onGet(
            "/rms-media/videos",
            [],
            this.auth.private,
            this.videos
        );

        this.onGet(
            "/rms-media/youtube",
            [],
            this.auth.private,
            this.youtube
        );

        this.onGet(
            "/rms-media/playlists",
            [],
            this.auth.private,
            this.playlists
        );

        this.onGet(
            "/rms-media/downloads",
            [],
            this.auth.private,
            this.downloads
        );


        // -----------------------------------------------------
        // RMS MEDIA API
        // -----------------------------------------------------

        this.onGet(
            "/api/rms-media/all",
            [],
            this.auth.private,
            this.getAll
        );

        this.onGet(
            "/api/rms-media/music",
            [],
            this.auth.private,
            this.getMusic
        );

        this.onGet(
            "/api/rms-media/videos",
            [],
            this.auth.private,
            this.getVideos
        );

        this.onGet(
            "/api/rms-media/search",
            [],
            this.auth.private,
            this.search
        );

        this.onGet(
            "/api/rms-media/:id",
            [],
            this.auth.private,
            this.getById
        );

        // -----------------------------------------------------
        // CREATE MEDIA
        // -----------------------------------------------------

        this.onPost(
            "/api/rms-media/create",
            [mediaUpload.single("file")],
            this.auth.private,
            this.create
        );


        // -----------------------------------------------------
        // UPDATE MEDIA
        // -----------------------------------------------------

        this.onPut(
            "/api/rms-media/update/:id",
            [mediaUpload.single("file")],
            this.auth.private,
            this.update
        );


        // -----------------------------------------------------
        // DELETE MEDIA
        // -----------------------------------------------------

        this.onDelete(
            "/api/rms-media/delete/:id",
            [],
            this.auth.private,
            this.delete
        );

        // =========================================================
        // YOUTUBE API
        // =========================================================

        this.onGet(
            "/api/rms-media/youtube/search",
            [],
            this.auth.private,
            this.youtubeSearch
        );

        this.onGet(
            "/api/rms-media/youtube/video",
            [],
            this.auth.private,
            this.youtubeVideo
        );

        this.onGet(
            "/api/rms-media/youtube/qualities",
            [],
            this.auth.private,
            this.youtubeQualities
        );

        this.onPost(
            "/api/rms-media/youtube/download",
            [],
            this.auth.private,
            this.youtubeDownload
        );
    }


    // =========================================================
    // MEDIA HOME
    // =========================================================

    public async index(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            return resp.view(
                "rms-media/index",
                {
                    activeMenu: "rms-media"
                }
            );

        } catch (error: any) {

            console.error(
                "RMS Media Index Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to load RMS Media"
            });
        }
    }


    // =========================================================
    // MUSIC PAGE
    // =========================================================

    public async music(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            return resp.view(
                "rms-media/music",
                {
                    activeMenu: "rms-media-music"
                }
            );

        } catch (error: any) {

            console.error(
                "RMS Media Music Page Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to load music page"
            });
        }
    }


    // =========================================================
    // VIDEOS PAGE
    // =========================================================

    public async videos(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            return resp.view(
                "rms-media/videos",
                {
                    activeMenu: "rms-media-videos"
                }
            );

        } catch (error: any) {

            console.error(
                "RMS Media Videos Page Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to load videos page"
            });
        }
    }


    // =========================================================
    // YOUTUBE PAGE
    // =========================================================

    public async youtube(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            return resp.view(
                "rms-media/youtube",
                {
                    activeMenu: "rms-media-youtube"
                }
            );

        } catch (error: any) {

            console.error(
                "RMS Media YouTube Page Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to load YouTube page"
            });
        }
    }


    // =========================================================
    // PLAYLISTS PAGE
    // =========================================================

    public async playlists(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            return resp.view(
                "rms-media/playlists",
                {
                    activeMenu: "rms-media-playlists"
                }
            );

        } catch (error: any) {

            console.error(
                "RMS Media Playlists Page Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to load playlists page"
            });
        }
    }


    // =========================================================
    // DOWNLOADS PAGE
    // =========================================================

    public async downloads(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            return resp.view(
                "rms-media/downloads",
                {
                    activeMenu: "rms-media-downloads"
                }
            );

        } catch (error: any) {

            console.error(
                "RMS Media Downloads Page Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to load downloads page"
            });
        }
    }


    // =========================================================
    // API - GET ALL MEDIA
    // =========================================================

    public async getAll(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const result =
                await this.rmsMediaService.getAll();

            return resp.json({
                status: true,
                message: "RMS Media fetched successfully",
                data: result
            });

        } catch (error: any) {

            console.error(
                "Get RMS Media Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch RMS Media",
                data: error.message
            });
        }
    }


    // =========================================================
    // API - GET MUSIC
    // =========================================================

    public async getMusic(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const result =
                await this.rmsMediaService.getMusic();

            return resp.json({
                status: true,
                message: "Music fetched successfully",
                data: result
            });

        } catch (error: any) {

            console.error(
                "Get RMS Music Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch music",
                data: error.message
            });
        }
    }


    // =========================================================
    // API - GET VIDEOS
    // =========================================================

    public async getVideos(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const result =
                await this.rmsMediaService.getVideos();

            return resp.json({
                status: true,
                message: "Videos fetched successfully",
                data: result
            });

        } catch (error: any) {

            console.error(
                "Get RMS Videos Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch videos",
                data: error.message
            });
        }
    }


    // =========================================================
    // API - GET MEDIA BY ID
    // =========================================================

    public async getById(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const id =
                Number(req.params.id);


            if (!id || id <= 0) {

                return resp.status(400).json({
                    status: false,
                    message: "Invalid media id"
                });
            }


            const result =
                await this.rmsMediaService.getById(id);


            if (!result) {

                return resp.status(404).json({
                    status: false,
                    message: "Media not found"
                });
            }


            return resp.json({
                status: true,
                message: "Media fetched successfully",
                data: result
            });

        } catch (error: any) {

            console.error(
                "Get RMS Media By ID Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to fetch media",
                data: error.message
            });
        }
    }


    // =========================================================
    // API - SEARCH MEDIA
    // =========================================================

    public async search(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const searchTerm =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";


            const result =
                await this.rmsMediaService.search(
                    searchTerm
                );


            return resp.json({
                status: true,
                message: "Media search completed successfully",
                data: result
            });

        } catch (error: any) {

            console.error(
                "Search RMS Media Error:",
                error
            );

            return resp.status(500).json({
                status: false,
                message: "Failed to search media",
                data: error.message
            });
        }
    }

    // =========================================================
    // API - CREATE MEDIA
    // =========================================================

    public async create(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const {
                title,
                artist,
                album,
                category,
                mediaType,
                description
            } = req.body;


            // -------------------------------------------------
            // VALIDATION
            // -------------------------------------------------

            if (!title || !String(title).trim()) {

                return resp.status(400).json({
                    status: false,
                    message: "Media title is required"
                });
            }


            if (
                mediaType !== "music" &&
                mediaType !== "video"
            ) {

                return resp.status(400).json({
                    status: false,
                    message: "Media type must be music or video"
                });
            }


            // -------------------------------------------------
            // FILE
            // -------------------------------------------------

            const file = (req as any).file;


            if (!file) {

                return resp.status(400).json({
                    status: false,
                    message: "Media file is required"
                });
            }


            // -------------------------------------------------
            // FILE PATH
            // -------------------------------------------------

            const filePath = `uploads/media/${file.filename}`;


            // -------------------------------------------------
            // USER
            // -------------------------------------------------

            const createdBy =
                req.user?.userId || "system";


            // -------------------------------------------------
            // CREATE DATABASE RECORD
            // -------------------------------------------------

            const result =
                await this.rmsMediaService.create({

                    title: String(title).trim(),

                    artist:
                        artist
                            ? String(artist).trim()
                            : undefined,

                    album:
                        album
                            ? String(album).trim()
                            : undefined,

                    category:
                        category
                            ? String(category).trim()
                            : undefined,

                    mediaType,

                    fileName:
                        file.originalname,

                    filePath,

                    mimeType:
                        file.mimetype,

                    fileSize:
                        file.size,

                    duration:
                        undefined,

                    thumbnail:
                        undefined,

                    description:
                        description
                            ? String(description).trim()
                            : undefined,

                    status:
                        "active",

                    createdBy

                });


            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

            return resp.status(201).json({

                status: true,

                message:
                    "RMS Media created successfully",

                data: result

            });

        } catch (error: any) {

            console.error(
                "Create RMS Media Error:",
                error
            );


            return resp.status(500).json({

                status: false,

                message:
                    "Failed to create RMS Media",

                data:
                    error.message

            });
        }
    }

    // =========================================================
    // API - UPDATE MEDIA
    // =========================================================

    public async update(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const id =
                Number(req.params.id);


            if (!id || id <= 0) {

                return resp.status(400).json({
                    status: false,
                    message: "Invalid media id"
                });
            }


            // -------------------------------------------------
            // GET EXISTING MEDIA
            // -------------------------------------------------

            const existing =
                await this.rmsMediaService.getById(id);


            if (!existing) {

                return resp.status(404).json({
                    status: false,
                    message: "Media not found"
                });
            }


            // -------------------------------------------------
            // BODY
            // -------------------------------------------------

            const {
                title,
                artist,
                album,
                category,
                mediaType,
                description,
                status
            } = req.body;


            // -------------------------------------------------
            // FILE
            // -------------------------------------------------

            const file =
                (req as any).file;


            let filePath =
                existing.filePath;

            let fileName =
                existing.fileName;

            let mimeType =
                existing.mimeType;

            let fileSize =
                existing.fileSize;


            // -------------------------------------------------
            // NEW FILE UPLOADED
            // -------------------------------------------------

            if (file) {

                // ---------------------------------------------
                // DELETE OLD FILE
                // ---------------------------------------------

                if (existing.filePath) {

                    const oldPath =
                        path.join(
                            process.cwd(),
                            existing.filePath
                        );


                    if (fs.existsSync(oldPath)) {

                        fs.unlinkSync(oldPath);
                    }
                }


                // ---------------------------------------------
                // SAVE NEW FILE INFORMATION
                // ---------------------------------------------

                filePath = `uploads/media/${file.filename}`;

                fileName =
                    file.originalname;

                mimeType =
                    file.mimetype;

                fileSize =
                    file.size;
            }


            // -------------------------------------------------
            // UPDATED BY
            // -------------------------------------------------

            const updatedBy =
                req.user?.userId || "system";


            // -------------------------------------------------
            // UPDATE DATABASE
            // -------------------------------------------------

            const result =
                await this.rmsMediaService.update(
                    id,
                    {

                        title:
                            title !== undefined
                                ? String(title).trim()
                                : existing.title,

                        artist:
                            artist !== undefined
                                ? String(artist).trim()
                                : existing.artist,

                        album:
                            album !== undefined
                                ? String(album).trim()
                                : existing.album,

                        category:
                            category !== undefined
                                ? String(category).trim()
                                : existing.category,

                        mediaType:
                            mediaType !== undefined
                                ? mediaType
                                : existing.mediaType,

                        fileName,

                        filePath,

                        mimeType,

                        fileSize,

                        description:
                            description !== undefined
                                ? String(description).trim()
                                : existing.description,

                        status:
                            status !== undefined
                                ? status
                                : existing.status,

                        updatedBy
                    }
                );


            return resp.json({

                status: true,

                message:
                    "RMS Media updated successfully",

                data:
                    result

            });

        } catch (error: any) {

            console.error(
                "Update RMS Media Error:",
                error
            );


            return resp.status(500).json({

                status: false,

                message:
                    "Failed to update RMS Media",

                data:
                    error.message

            });
        }
    }

    // =========================================================
    // API - DELETE MEDIA
    // =========================================================

    public async delete(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const id =
                Number(req.params.id);


            if (!id || id <= 0) {

                return resp.status(400).json({

                    status: false,

                    message:
                        "Invalid media id"

                });
            }


            // -------------------------------------------------
            // GET MEDIA
            // -------------------------------------------------

            const existing =
                await this.rmsMediaService.getById(id);


            if (!existing) {

                return resp.status(404).json({

                    status: false,

                    message:
                        "Media not found"

                });
            }


            // -------------------------------------------------
            // DELETE DATABASE RECORD
            // -------------------------------------------------

            const deleted =
                await this.rmsMediaService.delete(id);


            if (!deleted) {

                return resp.status(404).json({

                    status: false,

                    message:
                        "Failed to delete media"

                });
            }


            // -------------------------------------------------
            // DELETE PHYSICAL FILE
            // -------------------------------------------------

            if (existing.filePath) {

                const filePath =
                    path.join(
                        process.cwd(),
                        existing.filePath
                    );


                if (fs.existsSync(filePath)) {

                    fs.unlinkSync(filePath);
                }
            }


            // -------------------------------------------------
            // RESPONSE
            // -------------------------------------------------

            return resp.json({

                status: true,

                message:
                    "RMS Media deleted successfully",

                data: null

            });

        } catch (error: any) {

            console.error(
                "Delete RMS Media Error:",
                error
            );


            return resp.status(500).json({

                status: false,

                message:
                    "Failed to delete RMS Media",

                data:
                    error.message

            });
        }
    }

    // =========================================================
    // API - YOUTUBE SEARCH
    // =========================================================

    public async youtubeSearch(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const searchTerm =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";


            if (!searchTerm) {

                return resp.status(400).json({
                    status: false,
                    message: "YouTube search term is required"
                });
            }


            const result =
                await this.rmsMediaService.youtubeSearch(
                    searchTerm
                );


            return resp.json({
                status: true,
                message: "YouTube search completed successfully",
                data: result
            });


        } catch (error: any) {

            console.error(
                "YouTube Search Error:",
                error
            );


            return resp.status(500).json({
                status: false,
                message: error?.message || "Failed to search YouTube",
                data: error?.message
            });
        }
    }


    // =========================================================
    // YOUTUBE VIDEO
    // =========================================================

    public async youtubeVideo(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const videoId =
                typeof req.query.videoId === "string"
                    ? req.query.videoId.trim()
                    : "";


            if (!videoId) {

                return resp.status(400).json({
                    status: false,
                    message: "YouTube video ID is required"
                });
            }


            const result =
                await this.rmsMediaService.youtubeVideo(
                    videoId
                );


            if (!result) {

                return resp.status(404).json({
                    status: false,
                    message: "YouTube video not found"
                });
            }


            return resp.json({
                status: true,
                message: "YouTube video fetched successfully",
                data: result
            });


        } catch (error: any) {

            console.error(
                "YouTube Video Error:",
                error
            );


            return resp.status(500).json({
                status: false,
                message: "Failed to fetch YouTube video",
                data: error.message
            });
        }
    }


    // =========================================================
    // YOUTUBE QUALITIES
    // =========================================================

    public async youtubeQualities(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const videoId =
                typeof req.query.videoId === "string"
                    ? req.query.videoId.trim()
                    : "";


            if (!videoId) {

                return resp.status(400).json({
                    status: false,
                    message: "YouTube video ID is required"
                });
            }


            const result =
                await this.rmsMediaService.youtubeQualities(
                    videoId
                );


            return resp.json({
                status: true,
                message: "YouTube qualities fetched successfully",
                data: result
            });


        } catch (error: any) {

            console.error(
                "YouTube Qualities Error:",
                error
            );


            return resp.status(500).json({
                status: false,
                message: "Failed to fetch YouTube qualities",
                data: error.message
            });
        }
    }


    // =========================================================
    // YOUTUBE DOWNLOAD
    // =========================================================

    public async youtubeDownload(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {

        try {

            const {
                videoId,
                type,
                quality
            } = req.body;

            resp.setHeader(
                "Content-Type",
                "application/x-ndjson; charset=utf-8"
            );
            resp.setHeader(
                "Cache-Control",
                "no-cache, no-transform"
            );
            resp.setHeader(
                "X-Accel-Buffering",
                "no"
            );


            if (!videoId) {

                return resp.status(400).json({
                    status: false,
                    message: "YouTube video ID is required"
                });
            }


            if (
                type !== "audio" &&
                type !== "video"
            ) {

                return resp.status(400).json({
                    status: false,
                    message: "Download type must be audio or video"
                });
            }


            const result =
                await this.rmsMediaService.youtubeDownload({

                    videoId:
                        String(videoId).trim(),

                    type,

                    quality:
                        quality
                            ? String(quality)
                            : "best",

                    onProgress:
                        progress => {
                            resp.write(
                                JSON.stringify({
                                    type: "progress",
                                    data: progress
                                }) + "\n"
                            );
                        }
                });

            resp.write(
                JSON.stringify({
                    type: "complete",
                    status: true,
                    message: "YouTube download completed successfully",
                    data: result
                }) + "\n"
            );

            return resp.end();


        } catch (error: any) {

            console.error(
                "YouTube Download Error:",
                error
            );


            const errorData =
                JSON.stringify({
                    type: "error",
                    status: false,
                    message: "Failed to download YouTube media",
                    data: error.message
                }) + "\n";

            if (resp.headersSent) {
                resp.write(errorData);
                return resp.end();
            }

            return resp.status(500).json({
                status: false,
                message: "Failed to download YouTube media",
                data: error.message
            });
        }
    }
}
