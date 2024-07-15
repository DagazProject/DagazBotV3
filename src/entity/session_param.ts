import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { session } from "./session";
import { users } from "./users";

@Entity()
export class session_param {
    @PrimaryGeneratedColumn()
    id: number;

    @Index()
    @Column({ nullable: false })
    session_id: number;
    @ManyToOne(type => session)
    @JoinColumn({ name: "session_id" })
    session: session;

    @Index()
    @Column({ nullable: false })
    user_id: number;
    @ManyToOne(type => users)
    @JoinColumn({ name: "user_id" })
    user: users;

    @Column({ type: "integer", nullable: false })
    slot_index: number;

    @Column({ type: "integer", nullable: false })
    param_index: number;

    @Column({ type: "integer", nullable: false })
    param_value: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}