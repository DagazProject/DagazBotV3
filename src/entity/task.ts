import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { command } from "./command";

@Entity()
export class task {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    command_id: number;
    @ManyToOne(type => command)
    @JoinColumn({ name: "command_id" })
    command: command;

    @Column({ type: "bigint", nullable: false })
    timeout: number;
}