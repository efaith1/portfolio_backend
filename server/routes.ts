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

  @Router.get("/posts") // who wrote this?
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

  @Router.post("/reactions/:_id")
  async createUpvote(session: WebSessionDoc, _id: ObjectId, options?: ReactionOptions) {
    const user = WebSession.getUser(session);
    const post = (await Post.getPosts({ _id }))[0]._id;
    return await Reaction.upvote(user, post, options);
    // return { msg: created.msg, downvote: await Responses.reaction(created.reaction) };
  }

  @Router.delete("/reactions/:_id")
  async deleteUpvote(session: WebSessionDoc, _id: ObjectId, options?: ReactionOptions) {
    const user = WebSession.getUser(session);
    const post = (await Post.getPosts({ _id }))[0]._id;
    return await Reaction.downvote(user, post, options);
    // return { msg: created.msg, downvote: await Responses.reaction(created.reaction) };
  }

  @Router.get("/reactions/:_id")
  async getReactions(_id: ObjectId, options?: ReactionOptions) {
    const post = (await Post.getPosts({ _id }))[0]._id;
    return await Reaction.getReactions(post, options);
  }

  @Router.get("/reactions")
  async getAuthorUpvotes(session: WebSessionDoc, options?: ReactionOptions) {
    const user = WebSession.getUser(session);
    return await Reaction.getAuthorUpvotes(user, options);
  }

  @Router.post("/notifications")
  async createNotification(session: WebSessionDoc, content: string, options?: NotificationOptions) {
    const user = WebSession.getUser(session);
    const created = await Notification.send(user, content, options);
    return { msg: created.msg, notification: await Responses.notification(created.post) }; // could be a problem
  }

  @Router.put("/notifications/:_id")
  async markAsRead(session: WebSessionDoc, _id: ObjectId, update: Partial<NotificationDoc>) {
    const user = WebSession.getUser(session);
    await Notification.isAuthor(user, _id);
    return await Notification.markAsRead(_id, update);
  }

  @Router.put("/notifications/:_id")
  async markAsUnread(session: WebSessionDoc, _id: ObjectId, update: Partial<NotificationDoc>) {
    const user = WebSession.getUser(session);
    await Notification.isAuthor(user, _id);
    return await Notification.markAsUnread(_id, update);
  }

  @Router.put("/notifications")
  async unsubscribe(session: WebSessionDoc, update: Partial<NotificationDoc>) {
    const user = WebSession.getUser(session);
    return await Notification.unsubscribe(user, update);
  }

  @Router.get("/notifications")
  async getRead(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Notification.getRead(user);
  }

  @Router.get("/notifications")
  async getUnread(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Notification.getUnread(user);
  }

  @Router.delete("/notifications/:_notificationId")
  async clearNotification(session: WebSessionDoc, _notificationId: ObjectId) {
    const user = WebSession.getUser(session);
    await Notification.isAuthor(user, _notificationId);
    return await Notification.clearNotifications(_notificationId);
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
