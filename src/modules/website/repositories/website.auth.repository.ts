import { AppDataSource } from "../../../init";
import {
    IWebsiteAuthRepository,
    IWebsiteRegister
} from "../interfaces/website.auth.interface";

export class WebsiteAuthRepository
implements IWebsiteAuthRepository {

    public async register(
        data: IWebsiteRegister
    ): Promise<any> {

        const result =
            await AppDataSource.query(

                `
                INSERT INTO website_customers
                (

                    "customerCode",

                    "customerName",

                    email,

                    phone,

                    company,

                    address,

                    city,

                    country,

                    password,

                    status

                )

                VALUES
                (

                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10

                )

                RETURNING *

                `,

                [

                    data.customerCode,

                    data.customerName,

                    data.email,

                    data.phone,

                    data.company || null,

                    data.address || null,

                    data.city || null,

                    data.country || null,

                    data.password,

                    "Active"

                ]

            );

        return result[0];

    }

    public async login(
        email: string
    ): Promise<any> {

        const result =
            await AppDataSource.query(

                `
                SELECT *
                FROM website_customers
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,

                [email]

            );

        return result.length
            ? result[0]
            : null;

    }

    public async emailExists(
        email: string
    ): Promise<boolean> {

        const result =
            await AppDataSource.query(

                `
                SELECT id
                FROM website_customers
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                `,

                [email]

            );

        return result.length > 0;

    }

    public async getCustomerCountToday(): Promise<number> {

        const result =
            await AppDataSource.query(

                `
                SELECT COUNT(*)::int AS total
                FROM website_customers
                WHERE DATE("createdAt") = CURRENT_DATE
                `

            );

        return result[0].total;

    }

}