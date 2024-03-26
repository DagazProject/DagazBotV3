import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { users } from "./users";
import { service } from "./service";

@Entity()
export class message {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Index()
    @Column({ nullable: false })
    user_id: number;
    @ManyToOne(type => users)
    @JoinColumn({ name: "user_id" })
    user: users;

    @Index()
    @Column({ nullable: false })
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;

    @Index()
    @Column({ type: "bigint", nullable: true })
    reply_for: number;

    @Column({ type: "varchar", length: 5, nullable: true })
    lang: string;

    @Column({default: () => "now()", nullable: false})
    event_time: Date;

    @Column({ type: "bigint", nullable: false })
    message_id: number;

    @Column({ type: "text", nullable: false})
    data: string;
}