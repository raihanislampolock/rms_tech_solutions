import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { RmsInvoiceModel } from "./rms.invoice.model";

@Entity("rms_invoice_items")
export class RmsInvoiceItemModel {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: "invoiceId", type: "int" })
    invoiceId!: number;

    @Column({ name: "itemId", type: "int" })
    itemId!: number;

    @Column({ name: "quantity", type: "int", nullable: true })
    quantity?: number;

    @Column({ name: "unitPrice", type: "decimal", precision: 10, scale: 2, nullable: true })
    unitPrice?: number;

    @Column({ name: "totalPrice", type: "decimal", precision: 10, scale: 2, nullable: true })
    totalPrice?: number;

    @Column({ name: "notes", type: "text", nullable: true })
    notes?: string;

    @Column({ name: "createdBy", type: "int", nullable: true })
    createdBy?: number;

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;

    // Relations
    @ManyToOne(() => RmsInvoiceModel, invoice => invoice.items, { onDelete: "CASCADE" })
    @JoinColumn({ name: "invoiceId" })
    invoice!: RmsInvoiceModel;
}