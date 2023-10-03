import { User } from "./app";
import { AlreadyFriendsError, FriendNotFoundError, FriendRequestAlreadyExistsError, FriendRequestDoc, FriendRequestNotFoundError } from "./concepts/friend";
import { NotificationAuthorNotMatchError, NotificationDoc } from "./concepts/notification";
import { PostAuthorNotMatchError, PostDoc } from "./concepts/post";
import { ReactionAuthorNotMatchError, ReactionDoc } from "./concepts/reaction";
import { Router } from "./framework/router";

/**
 * This class does useful conversions for the frontend.
 * For example, it converts a {@link PostDoc} into a more readable format for the frontend.
 */
export default class Responses {
  /**
   * Convert PostDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async post(post: PostDoc | null) {
    if (!post) {
      return post;
    }
    const author = await User.getUserById(post.author);
    return { ...post, author: author.username };
  }

  /**
   * Same as {@link post} but for an array of PostDoc for improved performance.
   */
  static async posts(posts: PostDoc[]) {
    const authors = await User.idsToUsernames(posts.map((post) => post.author));
    return posts.map((post, i) => ({ ...post, author: authors[i] }));
  }

  /**
   * Convert FriendRequestDoc into more readable format for the frontend
   * by converting the ids into usernames.
   */
  static async friendRequests(requests: FriendRequestDoc[]) {
    const from = requests.map((request) => request.from);
    const to = requests.map((request) => request.to);
    const usernames = await User.idsToUsernames(from.concat(to));
    return requests.map((request, i) => ({ ...request, from: usernames[i], to: usernames[i + requests.length] }));
  }

  /**
   * Convert NotificationDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async notification(notification: NotificationDoc | null) {
    if (!notification) {
      return notification;
    }
    const author = await User.getUserById(notification.recipient);
    return { ...notification, author: author.username };
  }

  /**
   * Same as {@link notification} but for an array of NotificationDoc for improved performance.
   */
  static async notifications(notifications: NotificationDoc[]) {
    const authors = await User.idsToUsernames(notifications.map((notification) => notification.recipient));
    return notifications.map((notification, i) => ({ ...notification, author: authors[i] }));
  }

  /**
   * Convert ReactionDoc into more readable format for the frontend by converting the author id into a username.
   */
  static async reaction(reaction: ReactionDoc | null) {
    if (!reaction) {
      return reaction;
    }
    const author = await User.getUserById(reaction.author);
    return { ...reaction, author: author.username };
  }

  /**
   * Same as {@link reaction} but for an array of ReactionDoc for improved performance.
   */
  static async reactions(reactions: ReactionDoc[]) {
    const authors = await User.idsToUsernames(reactions.map((reaction) => reaction.author));
    return reactions.map((reaction, i) => ({ ...reaction, author: authors[i] }));
  }
}

Router.registerError(PostAuthorNotMatchError, async (e) => {
  const username = (await User.getUserById(e.author)).username;
  return e.formatWith(username, e._id);
});

Router.registerError(FriendRequestAlreadyExistsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(FriendRequestNotFoundError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.from), User.getUserById(e.to)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(AlreadyFriendsError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.user1), User.getUserById(e.user2)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(NotificationAuthorNotMatchError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.author), User.getUserById(e.author)]);
  return e.formatWith(user1.username, user2.username);
});

Router.registerError(ReactionAuthorNotMatchError, async (e) => {
  const [user1, user2] = await Promise.all([User.getUserById(e.author), User.getUserById(e.author)]);
  return e.formatWith(user1.username, user2.username);
});
