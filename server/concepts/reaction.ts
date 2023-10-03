import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

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

  async getReactionsHelper(query: Filter<ReactionDoc>) {
    const posts = await this.reactions.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async upvote(author: ObjectId, target: ObjectId, options?: ReactionOptions) {
    // error handling
    const alreadyUpvoted = await this.getReactionsHelper({ author, target });
    if (alreadyUpvoted.length !== 0) {
      await this.downvote(author, target);
    } else {
      const _id = await this.reactions.createOne({ author, target, options });
      return { msg: "Upvote successfully posted!", reaction: await this.reactions.readOne({ _id }) };
    }
  }

  async downvote(author: ObjectId, target: ObjectId, options?: ReactionOptions) {
    const alreadyDownvoted = await this.getReactionsHelper({ author, target });
    if (alreadyDownvoted.length === 0) {
      await this.upvote(author, target);
    } else {
      const _id = await this.reactions.deleteOne({ author, target, options });
      return { msg: "Downvote successfully posted!", reaction: await this.reactions.readOne({ _id }) };
    }
  }

  async getReactions(target: ObjectId, options?: ReactionOptions) {
    const _id = await this.getReactionsHelper({ target, options });
    return { msg: "Reaction count retrieved successfully!", reaction: await this.reactions.readOne({ _id }) };
  }

  async getAuthorUpvotes(author: ObjectId, options?: ReactionOptions) {
    const _id = await this.getReactionsHelper({ author, options });
    return { msg: "Author's reactions retrieved successfully!", reaction: await this.reactions.readOne({ _id }) };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const reaction = await this.reactions.readOne({ _id });
    if (!reaction) {
      throw new NotFoundError(`reaction ${_id} does not exist!`);
    }
    if (reaction.author.toString() !== user.toString()) {
      throw new ReactionAuthorNotMatchError(user, _id);
    }
  }
}

export class ReactionAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of reaaction {1}!", author, _id);
  }
}
