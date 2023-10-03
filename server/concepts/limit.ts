import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface LimitOptions {
  backgroundColor?: string;
}

export interface LimitDoc extends BaseDoc {
  resource: ObjectId;
  limit: Number;
  remaining: Number;
  resetTime: Number;
  options?: LimitOptions;
}

export default class LimitConcept {
  public readonly limits = new DocCollection<LimitDoc>("limits");

  async setLimit(resource: ObjectId, limit: Number, options?: LimitOptions) {
    const _id = await this.limits.createOne({ resource, limit, options });
    return { msg: "Limit successfully created!", limit: await this.limits.readOne({ _id }) };
  }

  async decrement(resource: ObjectId, limit: Number, options?: LimitOptions) {
    const _id = await this.limits.createOne({ resource, limit, options });
    return { msg: "Limit decremented successfully!", limit: await this.limits.readOne({ _id }) };
  }

  async getRemaining(resource: ObjectId, options?: LimitOptions) {
    const _id = await this.limits.readOne({ resource, options });
    return { msg: "Remaining limit retrieved successfully!", limit: _id };
  }

  async reset(resource: ObjectId, options?: LimitOptions) {
    const _id = await this.limits.createOne({ resource, options });
    return { msg: "Limit reset successfully!", limit: await this.limits.readOne({ _id }) };
  }

  async getStatus(resource: ObjectId, options?: LimitOptions) {
    const _id = await this.limits.createOne({ resource, options });
    return { msg: "Status retrieved successfully!", limit: await this.limits.readOne({ _id }) }; //bool
  }

  async timeUntilReset(resource: ObjectId, options?: LimitOptions) {
    const _id = await this.limits.readOne({ resource, options });
    return { msg: "Time until reset retrieved successfully!", limit: _id };
  }
}
