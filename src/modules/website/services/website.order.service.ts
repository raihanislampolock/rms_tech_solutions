import { IWebsiteOrderRepository, IWebsiteOrder } from "../interfaces/website.order.interface";

export class WebsiteOrderService {

    private orderRepository: IWebsiteOrderRepository;

    constructor(
        orderRepository: IWebsiteOrderRepository
    ) {

        this.orderRepository = orderRepository;

    }

    public async createOrder(
        customer: any,
        session: any
    ): Promise<any> {

        if (
            !session.cart ||
            !session.cart.items ||
            session.cart.items.length === 0
        ) {

            throw new Error(
                "Shopping cart is empty."
            );

        }

        const result =
            await this.orderRepository.createOrder(

                customer,

                session.cart

            );

        session.cart = {

            items: []

        };

        return result;

    }

    public async getAll(searchStr: string, page: number, limit: number): Promise<{

        data: IWebsiteOrder[];
        total: number;
        totalPages: number;
        currentPage: number;

    }> {
        try {
            return await this.orderRepository.getAll(searchStr, page, limit);
        } catch (error) {
            console.error("Error fetching Website Orders data:", error);
            throw new Error("Error fetching Website Orders data");
        }
    }

    public async edit(id: number): Promise<IWebsiteOrder | null> {
        try {

            const order = await this.orderRepository.edit(id);

            if (!order) {
                throw new Error(`No Website Order found with ID: ${id}`);
            }

            return order;

        } catch (error) {
            console.error("Error fetching Website Order:", error);
            throw new Error("Error fetching Website Order");
        }
    }

    public async update(id: number,updateData: Partial<IWebsiteOrder>): Promise<any> {

        try {

            return await this.orderRepository.update(id, updateData);

        } catch (error) {

            console.error("Error updating Website Order:", error);
            throw new Error("Error updating Website Order");

        }

    }

}