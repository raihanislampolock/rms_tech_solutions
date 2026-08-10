export interface IWebsiteCustomer {

    id?: number;

    customerCode?: string;

    customerName: string;

    email?: string;

    phone?: string;

    company?: string;

    address?: string;

    city?: string;

    country?: string;

    password?: string;

    status?: string;

    createdAt?: Date;

    updatedAt?: Date;

}

export interface IWebsiteCustomerRepository {

    create(
        customer: IWebsiteCustomer
    ): Promise<IWebsiteCustomer>;

    getById(
        id: number
    ): Promise<IWebsiteCustomer | null>;

    getByEmail(
        email: string
    ): Promise<IWebsiteCustomer | null>;

    getByPhone(
        phone: string
    ): Promise<IWebsiteCustomer | null>;

    getAll(
        searchStr: string,
        page: number,
        limit: number
    ): Promise<{

        data: IWebsiteCustomer[];

        total: number;

        totalPages: number;

        currentPage: number;

    }>;

    update(
        id: number,
        customer: Partial<IWebsiteCustomer>
    ): Promise<void>;

}