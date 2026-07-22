import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn} from "typeorm";

import { WebsiteOrder } from "./website_order";

@Entity("website_order_items")
export class WebsiteOrderItem {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    orderId!: number;

    @ManyToOne(
        () => WebsiteOrder,
        {
            onDelete: "CASCADE"
        }
    )
    @JoinColumn({name: "orderId"})
    order!: WebsiteOrder;

    @Column({nullable: true})
    itemId?: number;

    @Column({length: 200})
    itemName!: string;

    @Column()
    quantity!: number;

    @Column({ type: "numeric", precision: 12, scale: 2, default: 0})
    price!: number;

    @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
    total!: number;

}