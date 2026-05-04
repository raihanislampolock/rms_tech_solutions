import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

@Entity("rms_stock_movements")
export class RmsStockMovementModel {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    itemId!: number;

    @Column()
    quantity!: number;

    @Column()
    movementType!: string;
    // PURCHASE | SALE | ADJUSTMENT

    @Column()
    referenceId!: number; // purchaseId / saleId

    @Column({ nullable: true })
    note!: string;

    @CreateDateColumn()
    createdAt!: Date;
}