import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { users } from "./users";
import { session } from "./session";

@Entity()
export class user_session {
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
    session_id: number;
    @ManyToOne(type => session)
    @JoinColumn({ name: "session_id" })
    session: session;

    @Column({ type: "integer", nullable: false })
    user_num: number;
}