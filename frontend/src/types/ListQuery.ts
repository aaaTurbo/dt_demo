import {Direction} from "./Direction";

export interface ListQuery {
    limit?: number;
    cursor?: number | null;
    direction?: Direction;
    search?: string;
}