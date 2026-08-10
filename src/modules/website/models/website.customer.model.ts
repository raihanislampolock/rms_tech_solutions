import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("website_customers")
export class WebsiteCustomer {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    customerCode!: string;

    @Column()
    customerName!: string;

    @Column({ nullable: true })
    email!: string;

    @Column({ nullable: true })
    phone!: string;

    @Column({ nullable: true})
    company!: string;

    @Column({ type: "text", nullable: true })
    address!: string;

    @Column({ nullable: true })
    city!: string;

    @Column({ nullable: true })
    country!: string;

    @Column({ nullable: true })
    password!: string;

    @Column({ default: "Active" })
    status!: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

}