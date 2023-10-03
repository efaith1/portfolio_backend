import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

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

  async getAuthorLikes(author: ObjectId, options?: ReactionOptions) {
    const _id = await this.getReactionsHelper({ author, options });
    return { msg: "Author's reactions retrieved successfully!", reaction: await this.reactions.readOne({ _id }) };
  }
}
