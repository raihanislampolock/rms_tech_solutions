import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

@Entity("rms_quotation")
export class RmsQuotationModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 100, nullable: true })
    refNumber!: string;

    @Column({ type: "varchar", length: 50 })
    companyName!: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    companyEmail!: string | null;

    @Column({ type: "text" })
    subject!: string;

    @Column({ type: "text", nullable: true })
    discriptions!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string | null;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}