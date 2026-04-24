import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

@Entity("rms_quotation_items")
export class RmsQuotationItemModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    quotationId!: number; // FK

    @Column()
    itemId!: number;

    @Column({ type: "varchar", length: 255 })
    rmsPrice!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    quarterly!: string | null;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string | null;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;
}