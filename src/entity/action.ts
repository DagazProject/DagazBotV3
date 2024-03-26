import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { action_type } from "./action_type";
import { command } from "./command";
import { server } from "./server";
import { param_type } from "./param_type";

@Entity()
export class action {
    @PrimaryColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    type_id: number;
    @ManyToOne(type => action_type)
    @JoinColumn({ name: "type_id" })
    type: action_type;

    @Index()
    @Column({ nullable: false })
    command_id: number;
    @ManyToOne(type => command)
    @JoinColumn({ name: "command_id" })
    command: command;

    @Index()
    @Column({ type: "bigint", nullable: true })
    parent_id: number;
    @ManyToOne(type => action)
    @JoinColumn({ name: "parent_id" })
    parent: action;

    @Index()
    @Column({ nullable: true })
    server_id: number;
    @ManyToOne(type => server)
    @JoinColumn({ name: "server_id" })
    server: server;

    @Column({ nullable: true,  type: "varchar", length: 300 })
    request: string;

    @Column({ type: "integer", nullable: true })
    result_code: number;

    @Column({ type: "integer", nullable: true })
    width: number;

    @Column({ type: "integer", nullable: false })
    order_num: number;

    @Index()
    @Column({ nullable: true })
    param_id: number;
    @ManyToOne(type => param_type)
    @JoinColumn({ name: "param_id" })
    param: param_type;
}