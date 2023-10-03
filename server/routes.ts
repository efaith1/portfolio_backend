import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Friend, Limit, Notification, Post, Reaction, User, WebSession } from "./app";
import { LimitOptions } from "./concepts/limit";
import { NotificationDoc, NotificationOptions } from "./concepts/notification";
import { PostDoc, PostOptions } from "./concepts/post";
import { ReactionOptions } from "./concepts/reaction";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  @Router.post("/reactions/:postId")
  async createUpvote(session: WebSessionDoc, target: ObjectId, options?: ReactionOptions) {
    const user = WebSession.getUser(session);
    const post = (await Post.getPosts({ target }))[0]._id;
    return await Reaction.upvote(user, post, options);
  }

  @Router.delete("/reactions/:postId")
  async deleteUpvote(session: WebSessionDoc, target: ObjectId, options?: ReactionOptions) {
    const user = WebSession.getUser(session);
    const post = (await Post.getPosts({ target }))[0]._id;
    return await Reaction.downvote(user, post, options);
  }

  @Router.get("/reactions/:postId")
  async getReactions(target: ObjectId, options?: ReactionOptions) {
    const post = (await Post.getPosts({ target }))[0]._id;
    const created = await Reaction.getReactions(post, options);
    return { msg: created.msg, downvote: await Responses.reaction(created.reaction) };
  }

  @Router.get("/reactions/:id")
  async getUserLikes(session: WebSessionDoc, options?: ReactionOptions) {
    const user = WebSession.getUser(session);
    const created = await Reaction.getAuthorLikes(user, options);
    return { msg: created.msg, downvote: await Responses.reaction(created.reaction) };
  }

  @Router.post("/notifications")
  async createNotification(session: WebSessionDoc, content: string, options?: NotificationOptions) {
    const user = WebSession.getUser(session);
    const created = await Notification.send(user, content, options);
    return { msg: created.msg, notification: await Responses.notification(created.post) };
  }

  @Router.post("/notifications/:id")
  async markAsRead(content: ObjectId, update: Partial<NotificationDoc>) {
    const notification = await Notification.getNotificationById(content);
    const created = await Notification.markAsRead(notification[0]._id, update);
    return { msg: created.msg, notification: await Responses.notification(created.post) };
  }

  @Router.post("/notifications/:id")
  async markAsUnread(content: ObjectId, update: Partial<NotificationDoc>) {
    const notification = await Notification.getNotificationById(content);
    const created = await Notification.markAsUnread(notification[0]._id, update);
    return { msg: created.msg, notification: await Responses.notification(created.post) };
  }

  @Router.get("/notifications")
  async getRead(content: ObjectId) {
    const notification = await Notification.getNotificationById(content);
    return await Notification.listRead(notification[0]._id);
  }

  @Router.get("/notifications")
  async getUnread(content: ObjectId) {
    const notification = await Notification.getNotificationById(content);
    return await Notification.listUnread(notification[0]._id);
  }

  @Router.delete("/notifications/:notificationId")
  async clearNotification(content: ObjectId) {
    const notificationId = await Notification.getNotificationById(content);
    return await Notification.clearNotifications(notificationId[0]._id);
  }

  @Router.post("/notifications")
  async unsubscribe(user: ObjectId, update: Partial<NotificationDoc>) {
    const notificationId = await Notification.getNotificationById(user);
    return await Notification.unsubscribe(notificationId[0]._id, update);
  }

  @Router.post("/limits/resource")
  async createSessionLimit(concept: ObjectId, limit: Number, options?: LimitOptions) {
    const resource = concept;
    return await Limit.setLimit(resource, limit, options);
  }

  @Router.post("/limits/resource")
  async createUpvoteLimit(concept: ObjectId, limit: Number, options?: LimitOptions) {
    const resource = concept;
    return await Limit.setLimit(resource, limit, options);
  }

  @Router.put("/limits/resource")
  async decrementSessionLimit(concept: ObjectId, limit: Number, options?: LimitOptions) {
    const resource = concept;
    return await Limit.decrement(resource, limit, options);
  }

  @Router.get("/limits/resource")
  async getRemaining(concept: ObjectId) {
    const resource = concept;
    return await Limit.getRemaining(resource);
  }

  @Router.post("/limits/resource")
  async resetLimit(concept: ObjectId) {
    const resource = concept;
    return await Limit.reset(resource);
  }

  @Router.get("/limits/resource")
  async getStatus(concept: ObjectId, options?: LimitOptions) {
    const resource = concept;
    return await Limit.getStatus(resource, options);
  }

  @Router.get("/limits/resource")
  async getTimeToReset(concept: ObjectId) {
    const resource = concept;
    return await Limit.getRemaining(resource);
  }
}

export default getExpressRouter(new Routes());
