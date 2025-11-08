import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { users } from "./users";
import { script } from "./script";
import { stat_type } from "./stat_type";

@Entity()
export class stat {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 100, nullable: true })
    username: string;

    @Column({ type: "varchar", length: 100, nullable: false })
    script: string;

    @Index()
    @Column({ nullable: false })
    type_id: number;
    @ManyToOne(type => stat_type)
    @JoinColumn({ name: "type_id" })
    type: stat_type;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}