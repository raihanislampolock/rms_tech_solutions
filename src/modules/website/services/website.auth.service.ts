import crypto from "crypto";
import fs from "fs";

import { Config } from "../../../core/Config";
import { WebsiteAuthRepository } from "../repositories/website.auth.repository";
import { IWebsiteRegister } from "../interfaces/website.auth.interface";

const APP_CONFIG: Config =
    new Config(
        JSON.parse(
            fs.readFileSync("config.json").toString()
        )
    );

export class WebsiteAuthService {

    private repository =
        new WebsiteAuthRepository();

    private digestPassword(
        password: string
    ): string {

        return crypto
            .createHmac(
                "sha256",
                APP_CONFIG.authSecret
            )
            .update(
                `${password} - ${APP_CONFIG.authSalt}`
            )
            .digest("hex");

    }

    private async generateCustomerCode(): Promise<string> {

        const today =
            new Date();

        const date =
            today.getFullYear().toString()
            + String(today.getMonth() + 1).padStart(2, "0")
            + String(today.getDate()).padStart(2, "0");

        const total =
            await this.repository.getCustomerCountToday();

        return `CUS-${date}-${String(total + 1).padStart(5, "0")}`;

    }

    public async register(
        data: IWebsiteRegister
    ): Promise<any> {

        const exists =
            await this.repository.emailExists(
                data.email
            );

        if (exists) {

            throw new Error(
                "Email already exists."
            );

        }

        const customerCode =
            await this.generateCustomerCode();

        return await this.repository.register({

            ...data,

            customerCode,

            password:
                this.digestPassword(
                    data.password
                )

        });

    }

    public async login(
        email: string,
        password: string
    ): Promise<any> {

        const customer =
            await this.repository.login(
                email
            );

        if (!customer) {

            throw new Error(
                "Invalid email or password."
            );

        }

        const hashedPassword =
            this.digestPassword(
                password
            );

        if (
            customer.password !== hashedPassword
        ) {

            throw new Error(
                "Invalid email or password."
            );

        }

        if (
            customer.status !== "Active"
        ) {

            throw new Error(
                "Your account is inactive."
            );

        }

        return customer;

    }

}