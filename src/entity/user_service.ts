import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { users } from "./users";
import { service } from "./service";

@Entity()
@Unique(["user_id", "service_id"])
export class user_service {
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
    service_id: number;
    @ManyToOne(type => service)
    @JoinColumn({ name: "service_id" })
    service: service;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_developer: boolean;

    @Column({default: () => "now()", nullable: false})
    created: Date;
}