import fs from "fs";
import path from "path";
import ytdlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";


// =========================================================
// TYPES
// =========================================================

export interface YouTubeSearchResult {
    id: string;
    title: string;
    channel: string;
    channelId?: string;
    duration?: number;
    durationText?: string;
    thumbnail?: string;
    url: string;
    viewCount?: number;
    publishedAt?: string;
}


export interface YouTubeVideoInfo {
    id: string;
    title: string;
    description?: string;
    channel?: string;
    channelId?: string;
    thumbnail?: string;
    duration?: number;
    durationText?: string;
    viewCount?: number;
    webpageUrl: string;
}


export interface YouTubeQuality {
    formatId: string;
    type: "video" | "audio";
    extension?: string;
    resolution?: string;
    width?: number;
    height?: number;
    fps?: number;
    filesize?: number;
    filesizeApprox?: number;
    videoCodec?: string;
    audioCodec?: string;
    bitrate?: number;
}


export interface YouTubeDownloadOptions {
    videoId: string;
    type: "audio" | "video";
    quality: string;
    onProgress?: (progress: YouTubeDownloadProgress) => void;
}


export interface YouTubeDownloadProgress {
    percent: number;
    downloaded?: string;
    total?: string;
    speed?: string;
    eta?: string;
}


export interface YouTubeDownloadResult {
    videoId: string;
    title: string;
    type: "audio" | "video";
    requestedQuality: string;
    actualQuality?: string;
    fileName: string;
    filePath: string;
    fileUrl: string;
}


// =========================================================
// PROVIDER
// =========================================================

export class YouTubeProvider {

    private ytDlpPath: string;

    constructor() {

        this.ytDlpPath =
            process.env.YT_DLP_PATH ||
            path.join(
                path.dirname(
                    require.resolve("yt-dlp-exec")
                ),
                "..",
                "bin",
                process.platform === "win32"
                    ? "yt-dlp.exe"
                    : "yt-dlp"
            );
    }


    // =====================================================
    // EXECUTE YT-DLP
    // =====================================================

    private async execute(
        args: string[],
        onProgress?: (progress: YouTubeDownloadProgress) => void
    ): Promise<string> {

        console.log("========================================");
        console.log("YT-DLP COMMAND");
        console.log("Arguments:", args);
        console.log("========================================");

        try {
            const playerClients =
                process.env.YT_DLP_PLAYER_CLIENT
                    ? [process.env.YT_DLP_PLAYER_CLIENT]
                    : [
                        "android_vr",
                        "web_embedded",
                        "web_safari,web",
                        "android"
                    ];

            const authenticationArgs: string[] = [];
            const cookiesPath = process.env.YT_DLP_COOKIES;
            const browser = process.env.YT_DLP_BROWSER;

            if (cookiesPath) {
                authenticationArgs.push("--cookies", cookiesPath);
            } else if (browser) {
                authenticationArgs.push("--cookies-from-browser", browser);
            }

            let lastError: any;

            for (const playerClient of playerClients) {
                try {
                    const ytDlpArgs = [
                        "--js-runtimes",
                        "node",
                        "--remote-components",
                        "ejs:github",
                        "--extractor-args",
                        `youtube:player_client=${playerClient}`,
                        ...authenticationArgs,
                        ...args
                    ];

                    const executable: any =
                        (ytdlp as any).create(
                            this.ytDlpPath
                        );

                    const child: any = executable.exec(
                        ytDlpArgs,
                        {
                            ffmpegLocation:
                                ffmpegPath || undefined
                        },
                        {
                            stdio: "pipe",
                            windowsHide: true
                        }
                    );

                    if (onProgress && child.stdout) {
                        let pendingOutput = "";

                        child.stdout.on(
                            "data",
                            (chunk: Buffer | string) => {
                                pendingOutput += chunk.toString();

                                const lines =
                                    pendingOutput.split(/\r?\n/);

                                pendingOutput =
                                    lines.pop() || "";

                                lines.forEach(
                                    line => {
                                        const match =
                                            line.match(
                                                /\[download\]\s+(\d+(?:\.\d+)?)% of\s+(.+?) at\s+(.+?) ETA\s+(.+)/
                                            );

                                        if (match) {
                                            onProgress({
                                                percent:
                                                    Number(match[1]),
                                                downloaded:
                                                    match[2].trim(),
                                                speed:
                                                    match[3].trim(),
                                                eta:
                                                    match[4].trim()
                                            });
                                        }
                                    }
                                );
                            }
                        );
                    }

                    const output: any = await child;

                    const result =
                        output && typeof output.stdout === "string"
                            ? output.stdout
                            : typeof output === "string"
                                ? output
                                : String(output);

                    console.log("[yt-dlp stdout]", result);

                    return result;
                } catch (error: any) {
                    lastError = error;
                    console.error(
                        `YT-DLP client ${playerClient} failed:`,
                        error?.stderr || error?.message || error
                    );
                }
            }

            throw lastError || new Error("yt-dlp failed");

        } catch (error: any) {

            const stderr =
                error?.stderr ||
                error?.message ||
                String(error);

            console.error("YT-DLP ERROR:", stderr);

            throw new Error(
                typeof stderr === "string"
                    ? stderr.trim() || "yt-dlp failed"
                    : "yt-dlp failed"
            );
        }
    }

    // =====================================================
    // SEARCH YOUTUBE
    // =====================================================

    async search(
        searchTerm: string
    ): Promise<YouTubeSearchResult[]> {

        const term =
            typeof searchTerm === "string"
                ? searchTerm.trim()
                : "";

        if (!term) {
            return [];
        }

        // -------------------------------------------------
        // CHECK IF INPUT IS A YOUTUBE URL
        // -------------------------------------------------

        const youtubeVideoId =
            this.extractYouTubeVideoId(term);

        // -------------------------------------------------
        // DIRECT YOUTUBE VIDEO URL
        // -------------------------------------------------

        if (youtubeVideoId) {

            const video =
                await this.getVideo(youtubeVideoId);

            if (!video) {
                return [];
            }

            return [
                {
                    id: video.id,

                    title:
                        video.title ||
                        "Unknown title",

                    channel:
                        video.channel ||
                        "Unknown channel",

                    channelId:
                        video.channelId,

                    duration:
                        video.duration,

                    durationText:
                        video.durationText,

                    thumbnail:
                        video.thumbnail ||
                        `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,

                    url:
                        video.webpageUrl ||
                        `https://www.youtube.com/watch?v=${video.id}`,

                    viewCount:
                        video.viewCount
                }
            ];
        }

        // -------------------------------------------------
        // NORMAL YOUTUBE SEARCH
        // -------------------------------------------------

        const output =
            await this.execute([

                "--dump-single-json",

                "--flat-playlist",

                "--skip-download",

                "--no-warnings",

                `ytsearch10:${term}`
            ]);


        let data: any;

        try {

            data =
                JSON.parse(output);

        } catch (error) {

            console.error(
                "YouTube Search JSON Parse Error:",
                error
            );

            throw new Error(
                "Invalid response received from yt-dlp"
            );
        }


        const entries =
            Array.isArray(data.entries)
                ? data.entries
                : [];


        return entries
            .filter(
                (item: any) =>
                    item &&
                    item.id
            )
            .map(
                (item: any) => ({

                    id:
                        item.id,

                    title:
                        item.title ||
                        "Unknown title",

                    channel:
                        item.channel ||
                        item.uploader ||
                        "Unknown channel",

                    channelId:
                        item.channel_id,

                    duration:
                        item.duration,

                    durationText:
                        this.formatDuration(
                            item.duration
                        ),

                    thumbnail:
                        item.thumbnail ||
                        `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,

                    url:
                        item.webpage_url ||
                        `https://www.youtube.com/watch?v=${item.id}`,

                    viewCount:
                        item.view_count,

                    publishedAt:
                        item.upload_date
                })
            );
    }
    // =====================================================
    // VIDEO INFORMATION
    // =====================================================

    async getVideo(
        videoId: string
    ): Promise<YouTubeVideoInfo | null> {

        const id =
            videoId.trim();


        if (!id) {
            return null;
        }


        const url =
            `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;


        const output =
            await this.execute([

                "--dump-single-json",

                "--skip-download",

                "--no-warnings",

                url
            ]);


        const data =
            JSON.parse(output);


        if (!data || !data.id) {
            return null;
        }


        return {

            id:
                data.id,

            title:
                data.title ||
                "Unknown title",

            description:
                data.description,

            channel:
                data.channel ||
                data.uploader,

            channelId:
                data.channel_id,

            thumbnail:
                data.thumbnail ||
                `https://i.ytimg.com/vi/${data.id}/maxresdefault.jpg`,

            duration:
                data.duration,

            durationText:
                this.formatDuration(
                    data.duration
                ),

            viewCount:
                data.view_count,

            webpageUrl:
                data.webpage_url ||
                url
        };
    }

    // =====================================================
    // EXTRACT YOUTUBE VIDEO ID
    // =====================================================

    private extractYouTubeVideoId(
        value: string
    ): string | null {

        const input =
            value.trim();

        if (!input) {
            return null;
        }


        // -------------------------------------------------
        // youtube.com/watch?v=VIDEO_ID
        // -------------------------------------------------

        const watchMatch =
            input.match(
                /(?:youtube\.com\/watch\?[^#]*v=)([A-Za-z0-9_-]{11})/
            );

        if (watchMatch) {
            return watchMatch[1];
        }


        // -------------------------------------------------
        // youtu.be/VIDEO_ID
        // -------------------------------------------------

        const shortMatch =
            input.match(
                /youtu\.be\/([A-Za-z0-9_-]{11})/
            );

        if (shortMatch) {
            return shortMatch[1];
        }


        // -------------------------------------------------
        // youtube.com/shorts/VIDEO_ID
        // -------------------------------------------------

        const shortsMatch =
            input.match(
                /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/
            );

        if (shortsMatch) {
            return shortsMatch[1];
        }


        // -------------------------------------------------
        // youtube.com/embed/VIDEO_ID
        // -------------------------------------------------

        const embedMatch =
            input.match(
                /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/
            );

        if (embedMatch) {
            return embedMatch[1];
        }


        return null;
    }


    // =====================================================
    // GET AVAILABLE FORMATS
    // =====================================================

    async getQualities(
        videoId: string
    ): Promise<YouTubeQuality[]> {

        const id =
            videoId.trim();


        if (!id) {
            return [];
        }


        const url =
            `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;


        const output =
            await this.execute([

                "--dump-single-json",

                "--skip-download",

                "--no-warnings",

                url
            ]);


        const data =
            JSON.parse(output);


        if (
            !data ||
            !Array.isArray(data.formats)
        ) {

            return [];
        }


        const qualities:
            YouTubeQuality[] = [];


        for (
            const format of data.formats
        ) {

            const hasVideo =
                format.vcodec &&
                format.vcodec !== "none";


            const hasAudio =
                format.acodec &&
                format.acodec !== "none";


            if (!hasVideo && !hasAudio) {
                continue;
            }

            if (hasVideo && (!format.height || format.height < 1080 || format.height > 4320)) {
                continue;
            }


            qualities.push({

                formatId:
                    String(format.format_id),

                type:
                    hasVideo
                        ? "video"
                        : "audio",

                extension:
                    format.ext,

                resolution:
                    format.resolution,

                width:
                    format.width,

                height:
                    format.height,

                fps:
                    format.fps,

                filesize:
                    format.filesize,

                filesizeApprox:
                    format.filesize_approx,

                videoCodec:
                    format.vcodec,

                audioCodec:
                    format.acodec,

                bitrate:
                    format.tbr
            });
        }


        return qualities;
    }


    // =====================================================
    // DOWNLOAD
    // =====================================================

    async download(
        options: YouTubeDownloadOptions
    ): Promise<YouTubeDownloadResult> {

        const videoId =
            options.videoId.trim();


        if (!videoId) {

            throw new Error(
                "YouTube video ID is required"
            );
        }


        const type =
            options.type === "audio"
                ? "audio"
                : "video";


        const requestedQuality =
            options.quality ||
            "best";


        const url =
            `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;


        // -------------------------------------------------
        // GET VIDEO INFORMATION
        // -------------------------------------------------

        const video =
            await this.getVideo(videoId);


        if (!video) {

            throw new Error(
                "Unable to retrieve YouTube video"
            );
        }


        // -------------------------------------------------
        // DOWNLOAD DIRECTORY
        // -------------------------------------------------

        const downloadDirectory =
            path.join(
                process.cwd(),
                "uploads",
                "media",
                "youtube"
            );


        if (
            !fs.existsSync(
                downloadDirectory
            )
        ) {

            fs.mkdirSync(
                downloadDirectory,
                {
                    recursive: true
                }
            );
        }


        // -------------------------------------------------
        // SAFE FILE NAME
        // -------------------------------------------------

        const safeTitle =
            this.safeFileName(
                video.title
            );


        const outputTemplate =
            path.join(
                downloadDirectory,
                `${safeTitle} [${videoId}].%(ext)s`
            );


        // -------------------------------------------------
        // FORMAT
        // -------------------------------------------------

        let format: string;


        if (type === "audio") {

            format =
                "best[protocol^=m3u8]/bestaudio/best";

        } else {

            format =
                this.buildVideoFormat(
                    requestedQuality
                );
        }


        // -------------------------------------------------
        // YT-DLP ARGUMENTS
        // -------------------------------------------------

        const args: string[] = [

            "--no-warnings",

            "--no-playlist",

            "--newline",

            "--force-overwrites",

            "-f",
            format,

            "-o",
            outputTemplate
        ];


        // -------------------------------------------------
        // AUDIO
        // -------------------------------------------------

        if (type === "audio") {

            args.push(
                "-x",
                "--audio-format",
                "mp3"
            );
        }


        // -------------------------------------------------
        // VIDEO
        // -------------------------------------------------

        if (type === "video") {

            /*
             * Separate video/audio streams can be merged
             * by FFmpeg.
             */

            args.push(
                "--merge-output-format",
                "mp4",
                "--http-chunk-size",
                "10M"
            );
        }


        args.push(url);


        // -------------------------------------------------
        // RUN DOWNLOAD
        // -------------------------------------------------

        // Allow configuring additional yt-dlp options via environment variables
        // to handle restricted/geo-blocked content or requests that require
        // a browser cookie or custom User-Agent.

        // Custom User-Agent (optional)
        const customUA = process.env.YT_DLP_USER_AGENT;
        if (customUA) {
            args.push("--add-header", `User-Agent: ${customUA}`);
        }

        // Referer header (optional)
        const referer = process.env.YT_DLP_REFERER;
        if (referer) {
            args.push("--add-header", `Referer: ${referer}`);
        }

        // Geo bypass (optional)
        if (process.env.YT_DLP_GEO_BYPASS === "1") {
            args.push("--geo-bypass");
        }

        // Disable certificate checks if explicitly requested
        if (process.env.YT_DLP_NO_CHECK_CERT === "1") {
            args.push("--no-check-certificate");
        }

        await this.execute(
            args,
            options.onProgress
        );


        // -------------------------------------------------
        // FIND CREATED FILE
        // -------------------------------------------------

        const files =
            fs.readdirSync(
                downloadDirectory
            );


        const matchingFiles =
            files.filter(
                file =>
                    file.includes(
                        `[${videoId}]`
                    )
            );


        if (!matchingFiles.length) {

            throw new Error(
                "Download completed but output file was not found"
            );
        }


        const fileName =
            matchingFiles
                .sort(
                    (a, b) =>
                        fs.statSync(
                            path.join(
                                downloadDirectory,
                                b
                            )
                        ).mtimeMs -
                        fs.statSync(
                            path.join(
                                downloadDirectory,
                                a
                            )
                        ).mtimeMs
                )[0];


        const relativePath =
            path.join(
                "uploads",
                "media",
                "youtube",
                fileName
            );


        return {

            videoId,

            title:
                video.title,

            type,

            requestedQuality,

            actualQuality:
                requestedQuality,

            fileName,

            filePath:
                relativePath,

            fileUrl:
                "/" +
                relativePath
                    .replace(
                        /\\/g,
                        "/"
                    )
        };
    }


    // =====================================================
    // BUILD VIDEO FORMAT
    // =====================================================

    private buildVideoFormat(
        quality: string
    ): string {

        const requestedHeight =
            Number.parseInt(
                quality,
                10
            );

        const maxHeight =
            Number.isFinite(requestedHeight)
                ? Math.min(
                    4320,
                    Math.max(1080, requestedHeight)
                )
                : 4320;

        const format =
            `bestvideo[height>=1080][height<=${maxHeight}]+bestaudio/` +
            `best[height>=1080][height<=${maxHeight}]`

        console.log(
            `YouTube video format for ${quality}: ${format}`
        );

        return format;
    }


    // =====================================================
    // FORMAT DURATION
    // =====================================================

    private formatDuration(
        seconds?: number
    ): string {

        if (
            !seconds ||
            seconds < 0
        ) {

            return "0:00";
        }


        const hours =
            Math.floor(
                seconds / 3600
            );


        const minutes =
            Math.floor(
                (seconds % 3600) / 60
            );


        const remainingSeconds =
            Math.floor(
                seconds % 60
            );


        const secondText =
            String(
                remainingSeconds
            ).padStart(
                2,
                "0"
            );


        if (hours > 0) {

            return `${hours}:${String(minutes).padStart(2, "0")}:${secondText}`;
        }


        return `${minutes}:${secondText}`;
    }


    // =====================================================
    // SAFE FILE NAME
    // =====================================================

    private safeFileName(
        value: string
    ): string {

        return value
            .replace(
                /[<>:"/\\|?*\x00-\x1F]/g,
                ""
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .substring(
                0,
                150
            ) || "youtube-video";
    }
}