import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { script } from "./script";
import { command } from "./command";

@Entity()
export class param_type {
    @PrimaryGeneratedColumn()
    id: number;

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
    param_id: number;

    @Column({ type: "varchar", length: 100, nullable: false })
    name: string;

    @Column({ nullable: true,  type: "text" })
    default_value: string;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_hidden: boolean;
}