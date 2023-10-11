import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface LimitOptions {
  backgroundColor?: string;
}

export interface LimitDoc extends BaseDoc {
  resource: ObjectId;
  limit: number;
  remaining: number;
  resetTime: number;
  options?: LimitOptions;
}

export default class LimitConcept {
  public readonly limits = new DocCollection<LimitDoc>("limits");

  async setLimit(resource: ObjectId, limit: number, options?: LimitOptions) {
    const existingLimit = await this.limits.readOne({ resource });
    const resetTime = Date.now() + 24 * 3600000; // 24 hours in milliseconds

    if (existingLimit) {
      existingLimit.limit = limit;
      existingLimit.remaining = Math.min(existingLimit.remaining, limit); // will update in the next cycle
      existingLimit.resetTime = resetTime;
      existingLimit.options = options;
      return { msg: "Limit reset successfully to a new limit", update: await this.limits.updateOne({ _id: existingLimit._id }, existingLimit) };
    } else {
      const newLimit = {
        resource: resource,
        limit: limit,
        remaining: limit,
        resetTime: resetTime,
        options: options,
      };
      return { msg: "Limit successfully created!", applied_to: await this.limits.createOne(newLimit) };
    }
  }

  async decrement(resource: ObjectId, decrement: number) {
    const existingLimit = await this.limits.readOne({ resource });

    if (!existingLimit) {
      throw new Error("Limit not found for the specified resource.");
    }

    if (existingLimit.remaining >= decrement) {
      existingLimit.remaining -= decrement;
      return { msg: "Limit decremented successfully!", result: await this.limits.updateOne({ _id: existingLimit._id }, existingLimit) };
    } else {
      throw new Error("Decrement exceeds the remaining limit count.");
    }
  }

  async getRemaining(resource: ObjectId) {
    const existingLimit = await this.limits.readOne({ resource });

    if (!existingLimit) {
      throw new Error("Limit not found for the specified resource.");
    }

    return { msg: "Got remaining resources successfully", remaining: existingLimit.remaining };
  }

  async reset(resource: ObjectId) {
    const existingLimit = await this.limits.readOne({ resource });

    if (!existingLimit) {
      throw new Error("Limit not found for the specified resource.");
    }

    existingLimit.remaining = existingLimit.limit;
    existingLimit.resetTime = Date.now() + 24 * 3600000; // Reset to 24 hours from now
    return { msg: "Limit restored successfully!", limit: await this.limits.updateOne({ _id: existingLimit._id }, existingLimit) };
  }

  async getStatus(resource: ObjectId) {
    const existingLimit = await this.limits.readOne({ resource });

    if (!existingLimit) {
      throw new Error("Limit not found for the specified resource.");
    }

    const resetTime = new Date(existingLimit.resetTime);

    return { limit: existingLimit.limit, remaining: existingLimit.remaining, resetTime };
  }

  async timeUntilReset(resource: ObjectId) {
    const existingLimit = await this.limits.readOne({ resource });

    if (!existingLimit) {
      throw new Error("Limit not found for the specified resource.");
    }

    const currentTime = Date.now();
    const resetTime = existingLimit.resetTime;

    if (resetTime <= currentTime) {
      return { msg: "Reset time has already passed", value: 0 };
    } else {
      const timeUntilResetInMilliseconds = resetTime - currentTime;
      const timeUntilResetInHours = Math.ceil(timeUntilResetInMilliseconds / (1000 * 60 * 60));
      return timeUntilResetInHours + " hours";
    }
  }
}
