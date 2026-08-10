import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

@Entity("rms_media")
export class RmsMediaModel {

    @PrimaryGeneratedColumn()
    id!: number;

    // ---------------------------------------------------------
    // MEDIA INFORMATION
    // ---------------------------------------------------------

    @Column({ type: "varchar", length: 255, nullable: false })
    title!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    artist!: string;

    @Column({ type: "varchar", length: 255, nullable: true })
    album!: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    category!: string;

    // music / video
    @Column({ type: "varchar", length: 20, nullable: false })
    mediaType!: string;

    // ---------------------------------------------------------
    // FILE INFORMATION
    // ---------------------------------------------------------

    @Column({ type: "varchar", length: 500, nullable: false })
    fileName!: string;

    @Column({ type: "varchar", length: 1000, nullable: false })
    filePath!: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    mimeType!: string;

    @Column({ type: "bigint", nullable: true })
    fileSize!: number;

    // Duration in seconds
    @Column({ type: "integer", nullable: true })
    duration!: number;

    // ---------------------------------------------------------
    // THUMBNAIL
    // ---------------------------------------------------------

    @Column({ type: "varchar", length: 1000, nullable: true })
    thumbnail!: string;

    // ---------------------------------------------------------
    // DESCRIPTION
    // ---------------------------------------------------------

    @Column({ type: "text", nullable: true })
    description!: string;

    // ---------------------------------------------------------
    // STATUS
    // ---------------------------------------------------------

    @Column({
        type: "varchar",
        length: 20,
        default: "active"
    })
    status!: string;

    // ---------------------------------------------------------
    // AUDIT
    // ---------------------------------------------------------

    @Column({ type: "varchar", length: 50, nullable: true })
    createdBy!: string;

    @Column({ type: "varchar", length: 50, nullable: true })
    updatedBy!: string;

    // ---------------------------------------------------------
    // TIMESTAMPS
    // ---------------------------------------------------------

    @CreateDateColumn({ name: "created_at" })
    createdAt!: Date;

    @UpdateDateColumn({ name: "updated_at" })
    updatedAt!: Date;
}
