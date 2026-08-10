import { Controller } from "../../../core/Controller";
import { HttpRequest, HttpResponse } from "../../../core/Types";
import { WebsiteAuthService } from "../services/website.auth.service";

export class WebsiteAuthController extends Controller {

    private websiteAuthService: WebsiteAuthService;

    private auth = {
        private: false,
        public: true
    };

    constructor() {

        super();

        this.websiteAuthService =
            this.getService(
                "WebsiteAuthService"
            );

    }

    public onRegister(): void {

        // Pages
        this.onGet("/website/login", [], this.auth.public, this.loginView);
        this.onPost("/website/login", [], this.auth.public, this.login);
        this.onGet("/website/register", [], this.auth.public, this.registerView);
        this.onPost("/website/register", [], this.auth.public, this.register);
        this.onGet("/website/logout", [], this.auth.public, this.logout);

    }

    public registerView(
        req: HttpRequest,
        resp: HttpResponse
    ) {

        return resp.view(
            "website/auth/register",
            {
                page: "register"
            }
        );

    }

    public loginView(
        req: HttpRequest,
        resp: HttpResponse
    ) {

        return resp.view(
            "website/auth/login",
            {
                page: "login"
            }
        );

    }

    // public loginView(
    //     req: HttpRequest,
    //     resp: HttpResponse
    // ) {
    //     return resp.send("Website Login Works");
    // }

    public async register(
        req: HttpRequest,
        resp: HttpResponse
    ) {

        try {

            const customer =
                await this.websiteAuthService.register(
                    req.body
                );

            return resp.json({

                status: true,

                message: "Registration successful.",

                data: customer

            });

        }

        catch (error) {

            return resp.json({

                status: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Registration failed."

            });

        }

    }

    public async login(
        req: HttpRequest,
        resp: HttpResponse
    ) {

        try {

            const customer =
                await this.websiteAuthService.login(

                    req.body.email,

                    req.body.password

                );

            // JWT will be added next
            return resp.json({

                status: true,

                message: "Login successful.",

                customer

            });

        }

        catch (error) {

            return resp.json({

                status: false,

                message:
                    error instanceof Error
                        ? error.message
                        : "Login failed."

            });

        }

    }

    public logout(
        req: HttpRequest,
        resp: HttpResponse
    ) {

        resp.cookie(
            "website_token",
            "",
            {
                expires: new Date(0)
            }
        );

        return resp.redirect("/");

    }

}