import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { script } from "./script";
import { text_type } from "./text_type";

@Entity()
export class quest_text {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    type_id: number;
    @ManyToOne(type => text_type)
    @JoinColumn({ name: "type_id" })
    type: text_type;

    @Index()
    @Column({ nullable: false })
    script_id: number;
    @ManyToOne(type => script)
    @JoinColumn({ name: "script_id" })
    script: script;

    @Column({ nullable: false,  type: "text" })
    value: string;
}