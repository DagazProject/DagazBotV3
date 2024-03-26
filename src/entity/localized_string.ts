import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { action } from "./action";
import { command } from "./command";

@Entity()
export class localized_string {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: true })
    command_id: number;
    @ManyToOne(type => command)
    @JoinColumn({ name: "command_id" })
    command: command;
    
    @Index()
    @Column({ nullable: true })
    action_id: number;
    @ManyToOne(type => action)
    @JoinColumn({ name: "action_id" })
    action: action;

    @Column({ type: "varchar", length: 5, nullable: true })
    lang: string;

    @Column({ nullable: false,  type: "text" })
    value: string;
}