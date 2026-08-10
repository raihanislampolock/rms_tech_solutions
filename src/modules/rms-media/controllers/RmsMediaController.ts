import { Controller } from "../../../core/Controller";
import {
    NextFunc,
    HttpRequest,
    HttpResponse
} from "../../../core/Types";

export class RmsMediaController extends Controller {

    private auth = {
        private: true,
        public: false
    };

    constructor() {
        super();
    }

    public onRegister(): void {

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
    }

    public async index(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        return resp.view(
            "rms-media/index",
            {
                activeMenu: "rms-media"
            }
        );
    }

    public async music(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        return resp.view(
            "rms-media/music",
            {
                activeMenu: "rms-media-music"
            }
        );
    }

    public async videos(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        return resp.view(
            "rms-media/videos",
            {
                activeMenu: "rms-media-videos"
            }
        );
    }

    public async youtube(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        return resp.view(
            "rms-media/youtube",
            {
                activeMenu: "rms-media-youtube"
            }
        );
    }

    public async playlists(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        return resp.view(
            "rms-media/playlists",
            {
                activeMenu: "rms-media-playlists"
            }
        );
    }

    public async downloads(
        req: HttpRequest,
        resp: HttpResponse,
        next: NextFunc
    ) {
        return resp.view(
            "rms-media/downloads",
            {
                activeMenu: "rms-media-downloads"
            }
        );
    }
}