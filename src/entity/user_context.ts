import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { users } from "./users";
import { script } from "./script";
import { command } from "./command";
import { service } from "./service";

@Entity()
export class user_context {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: true })
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
    @Column({ nullable: true })
    script_id: number;
    @ManyToOne(type => script)
    @JoinColumn({ name: "script_id" })
    script: script;

    @Index()
    @Column({ nullable: true })
    command_id: number;
    @ManyToOne(type => command)
    @JoinColumn({ name: "command_id" })
    command: command;

    @Column({ type: "bigint", nullable: true })
    location_id: number;

    @Column({ type: "integer", default: 0, nullable: false })
    priority: number;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_waiting: boolean;

    @Column({ type: "bigint", nullable: true })
    hide_id: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;

    @Column({default: () => "now()", nullable: false})
    updated: Date;

    @Column({nullable: true})
    closed: Date;
}