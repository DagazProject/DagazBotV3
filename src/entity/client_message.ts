import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { message } from "./message";

@Entity()
export class client_message {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    parent_id: number;
    @ManyToOne(type => message)
    @JoinColumn({ name: "parent_id" })
    parent: message;

    @Index()
    @Column({ type: "bigint", nullable: false })
    message_id: number;
}