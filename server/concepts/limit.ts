import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface LimitOptions {
  backgroundColor?: string;
}

export interface LimitDoc extends BaseDoc {
  resource: ObjectId;
  type: string;
  limit: number;
  remaining: number;
  resetTime: number;
  options?: LimitOptions;
}

export default class LimitConcept {
  public readonly limits = new DocCollection<LimitDoc>("limits");

  async setLimit(resource: ObjectId, limit: number, type: string, options?: LimitOptions) {
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
        resource: new ObjectId(resource),
        type: type,
        limit: limit,
        remaining: limit,
        resetTime: resetTime,
        options: options,
      };
      return { msg: "Limit successfully created!", newLimit: await this.limits.createOne(newLimit) };
    }
  }

  async decrement(resource: ObjectId, decrement: number, type: string) {
    const existingLimit = await this.limits.readOne({ resource: new ObjectId(resource), type: type });

    if (!existingLimit) {
      throw new Error("No limit to decrement.");
    }

    if (existingLimit.remaining >= decrement) {
      existingLimit.remaining -= decrement;
      return { msg: "Limit decremented successfully!", type: type, result: await this.limits.updateOne({ _id: existingLimit._id }, existingLimit) };
    } else {
      throw new Error("Decrement exceeds remaining resources. Try a smaller number");
    }
  }

  async getRemaining(resource: ObjectId, type: string) {
    const existingLimit = await this.limits.readOne({ resource: new ObjectId(resource), type: type });

    if (!existingLimit) {
      throw new Error("No limit set. Retry if you see a remaining parameter or set a limit");
    }

    return { msg: "Got remaining resources successfully", type: type, remaining: existingLimit.remaining };
  }

  async reset(resource: ObjectId, type: string) {
    const existingLimit = await this.limits.readOne({ resource: new ObjectId(resource), type: type });
    if (!existingLimit) {
      throw new Error("No limit found to reset");
    }
    existingLimit.remaining = existingLimit.limit;
    existingLimit.resetTime = Date.now() + 24 * 3600000; // Reset to 24 hours from now
    return { msg: "Limit restored successfully!", type: type, limit: await this.limits.updateOne({ _id: existingLimit._id }, existingLimit) };
  }

  async getStatus(resource: ObjectId, type: string) {
    const existingLimit = await this.limits.readOne({ resource: new ObjectId(resource), type: type });

    if (!existingLimit) {
      throw new Error("No limit to get status of.");
    }

    const resetTime = new Date(existingLimit.resetTime);

    return { type: type, limit: existingLimit.limit, remaining: existingLimit.remaining, resetTime };
  }

  async timeUntilReset(resource: ObjectId, type: string) {
    const existingLimit = await this.limits.readOne({ resource: new ObjectId(resource), type: type });

    if (!existingLimit) {
      throw new Error("Check resource spelling. Limit not found for the specified resource.");
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
