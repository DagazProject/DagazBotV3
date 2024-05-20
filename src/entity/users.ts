import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";

@Entity()
export class users {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: false,  type: "boolean", default: false })
    is_admin: boolean;

    @Index()
    @Unique(["username"])
    @Column({ nullable: true,  type: "varchar", length: 100 })
    username: string;

    @Column({ type: "varchar", length: 100 })
    firstname: string;

    @Column({ type: "varchar", length: 100, nullable: true })
    lastname: string;

    @Column({ type: "varchar", length: 5, nullable: false })
    lang: string;

    @Index()
    @Unique(["user_id"])
    @Column({ type: "bigint", nullable: false })
    user_id: number;

    @Column({ type: "bigint", nullable: false })
    chat_id: number;

    @Column({default: () => "now()", nullable: false})
    created: Date;

    @Column({default: () => "now()", nullable: false})
    updated: Date;
}