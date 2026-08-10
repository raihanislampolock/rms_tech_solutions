import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

@Entity("website_order")
export class WebsiteOrder {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 50, unique: true })
    orderNumber!: string;

    @Column({ nullable: true })
    customerId!: number;

    @Column({length: 200})
    customerName!: string;

    @Column({length: 200, nullable: true })
    email?: string;

    @Column({length: 50,nullable: true})
    phone?: string;

    @Column({ length: 200, nullable: true})
    company?: string;

    @Column({type: "text"})
    address!: string;

    @Column({ length: 100, nullable: true})
    city?: string;

    @Column({length: 100,nullable: true})
    country?: string;

    @Column({ type: "text", nullable: true})
    notes?: string;

    @Column({ type: "numeric", precision: 12, scale: 2, default: 0})
    grandTotal!: number;

    @Column({ length: 30, default: "Pending" })
    status!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

}