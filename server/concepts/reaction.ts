import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError } from "./errors";

export interface ReactionOptions {
  backgroundColor?: string;
  read?: boolean;
}

export interface ReactionDoc extends BaseDoc {
  author: ObjectId;
  target: ObjectId;
  options?: ReactionOptions;
}

export default class ReactionConcept {
  public readonly reactions = new DocCollection<ReactionDoc>("reactions");

  async upvote(author: ObjectId, target: ObjectId, options?: ReactionOptions) {
    const existingReaction = await this.reactions.readOne({ author, target });
    if (existingReaction) {
      throw new Error("User has already upvoted this post.");
    }
    const _id = await this.reactions.createOne({ author, target, options });
    return { msg: "Upvote created successfully!", reaction: await this.reactions.readOne({ _id }) };
  }

  async downvote(author: ObjectId, target: ObjectId, options?: ReactionOptions) {
    const reaction = await this.reactions.readOne({ author: author, target: target });
    if (!reaction) {
      throw new Error("User has not upvoted this post.");
    }
    const _id = await this.reactions.deleteOne({ author, target, options });
    return { msg: "Downvote created successfully!", reaction: await this.reactions.readOne({ _id }) };
  }

  async getReactions(query: Filter<ReactionDoc>) {
    const reactions = await this.reactions.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return reactions;
  }

  async getReactionCount(target: ObjectId) {
    const count = await this.reactions.readMany({ target: new ObjectId(target) });
    return count.length;
  }

  async getByAuthor(author: ObjectId) {
    return await this.getReactions({ author: new ObjectId(author) });
  }
}

export class ReactionAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of reaction {1}!", author, _id);
  }
}
