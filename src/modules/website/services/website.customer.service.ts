import { Config } from "../../../core/Config";
import { WebsiteCustomerRepository } from "../repositories/website.customer.repository";
import { IWebsiteCustomer } from "../interfaces/website.customer.interface";

import fs from "fs";
import crypto from "crypto";

const APP_CONFIG = new Config(
    JSON.parse(
        fs.readFileSync("config.json").toString()
    )
);

export class WebsiteCustomerService {

    private repository =
        new WebsiteCustomerRepository();

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

    public async create(
        customer: IWebsiteCustomer
    ): Promise<IWebsiteCustomer> {

        const emailExists =
            customer.email
                ? await this.repository.getByEmail(
                    customer.email
                )
                : null;

        if (emailExists) {

            throw new Error(
                "Email already exists."
            );

        }

        const phoneExists =
            customer.phone
                ? await this.repository.getByPhone(
                    customer.phone
                )
                : null;

        if (phoneExists) {

            throw new Error(
                "Phone number already exists."
            );

        }

        if (customer.password) {

            customer.password =
                this.digestPassword(
                    customer.password
                );

        }

        customer.status =
            customer.status || "Active";

        return await this.repository.create(
            customer
        );

    }

    public async getAll(
        searchStr: string,
        page: number = 1,
        limit: number = 10
    ) {

        return await this.repository.getAll(
            searchStr,
            page,
            limit
        );

    }

    public async getById(
        id: number
    ) {

        return await this.repository.getById(
            id
        );

    }

    public async edit(
        id: number
    ) {

        return await this.repository.edit(
            id
        );

    }

    public async update(
        id: number,
        data: Partial<IWebsiteCustomer>
    ) {

        return await this.repository.update(
            id,
            data
        );

    }

    public async login(
        email: string,
        password: string
    ): Promise<IWebsiteCustomer> {

        const customer =
            await this.repository.getByEmail(
                email
            );

        if (!customer) {

            throw new Error(
                "Invalid email or password."
            );

        }

        if (customer.status !== "Active") {

            throw new Error(
                "Your account is inactive. Please contact support."
            );

        }

        const hashedPassword =
            this.digestPassword(
                password
            );

        if (customer.password !== hashedPassword) {

            throw new Error(
                "Invalid email or password."
            );

        }

        return customer;

    }

    public async changePassword(
        id: number,
        password: string
    ): Promise<any> {

        const hashedPassword =
            this.digestPassword(
                password
            );

        return await this.repository.changePassword(

            id,

            hashedPassword

        );

    }
    public async emailExists(
        email: string
    ): Promise<boolean> {
        const customer =
            await this.repository.getByEmail(
                email
            );
        return !!customer;
    }

    public async phoneExists(
        phone: string
    ): Promise<boolean> {
        const customer =
            await this.repository.getByPhone(
                phone
            );
        return !!customer;
    }

}