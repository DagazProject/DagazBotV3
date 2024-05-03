import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { command } from "./command";
import { param_type } from "./param_type";

@Entity()
export class command_param {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    command_id: number;
    @ManyToOne(type => command)
    @JoinColumn({ name: "command_id" })
    command: command;

    @Index()
    @Column({ nullable: false })
    param_id: number;
    @ManyToOne(type => param_type)
    @JoinColumn({ name: "param_id" })
    param: param_type;

    @Column({ nullable: true,  type: "text" })
    default_value: string;

    @Column({ type: "integer", default: 0, nullable: false })
    order_num: number;
}