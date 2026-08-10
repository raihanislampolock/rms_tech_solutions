export interface IWebsiteLogin {

    email: string;

    password: string;

}

export interface IWebsiteRegister {

    customerCode: string;

    customerName: string;

    email: string;

    phone: string;

    password: string;

    company?: string;

    address?: string;

    city?: string;

    country?: string;

}

export interface IWebsiteAuthRepository {

    register(
        data: IWebsiteRegister
    ): Promise<any>;

    login(
        email: string
    ): Promise<any>;

    emailExists(
        email: string
    ): Promise<boolean>;

    getCustomerCountToday(): Promise<number>;

}