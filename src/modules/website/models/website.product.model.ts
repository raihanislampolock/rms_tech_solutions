import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("website_products")
export class WebsiteProductModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    itemId!: number;

    @Column({ default: false })
    featured!: boolean;

    @Column({ default: true })
    websiteVisible!: boolean;

    @Column({ nullable: true })
    slug!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}