import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { users } from "./users";
import { info } from "./info";

@Entity()
export class user_info {
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
    info_id: number;
    @ManyToOne(type => info)
    @JoinColumn({ name: "info_id" })
    info: info;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}