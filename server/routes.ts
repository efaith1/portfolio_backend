import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Friend, Limit, Notification, Post, Reaction, User, WebSession } from "./app";
import { LimitOptions } from "./concepts/limit";
import { NotificationOptions } from "./concepts/notification";
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
    try {
      const loginToken = await Limit.getRemaining(u._id, "loginToken");
      if (loginToken.remaining > 0) {
        WebSession.start(session, u._id);
        return { msg: "Logged in!", remaining: loginToken.remaining / (60 * 60 * 1000) + " hours" };
      } else {
        const timeUntilReset = await Limit.timeUntilReset(u._id, "loginToken");
        return { msg: `You have exceeded your time online today. Please try again in ${timeUntilReset}` };
      }
    } catch (error) {
      await Limit.setLimit(u._id, 5 * 60 * 60 * 1000, "loginToken"); // A default of 5 hrs (in milliseconds)
      return {
        msg: error instanceof Error && error.message ? error.message : "You had not set a login limit. Try logging in again.",
        remaining: (await Limit.getRemaining(u._id, "loginToken")).remaining / (60 * 60 * 1000) + " hours",
      };
    }
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    try {
      const timeElapsed = WebSession.calculateTimeLoggedIn(session);
      const user = WebSession.getUser(session);
      if (typeof timeElapsed === "number") {
        await Limit.decrement(user, timeElapsed, "loginToken");
        WebSession.end(session);
        return {
          msg: "Logged out!",
          remaining: (await Limit.getRemaining(user, "loginToken")).remaining / (60 * 60 * 1000) + " hours",
        };
      } else {
        return { msg: "Error calculating time elapsed" };
      }
    } catch (error) {
      return { msg: "Error while logging out, you refreshed the page before logging out" };
    }
  }

  async backgroundCheck() {
    // Citation: gpt for debugging
    const loggedInSessions = WebSession.getActiveSessions();
    loggedInSessions.forEach(async (session) => {
      try {
        // Calculate the time elapsed since the last check
        const timeElapsed = WebSession.calculateTimeLoggedIn(session);
        const user = WebSession.getUser(session);
        if (typeof timeElapsed === "number") {
          // Decrement the time limit based on the elapsed time
          const decremented = await Limit.decrement(user, timeElapsed, "loginToken");
          const getRemaining = await Limit.getRemaining(user, "loginToken");

          if (decremented && getRemaining.remaining <= 0) {
            // The time limit has expired, log the user out
            WebSession.end(session);
            return { msg: "You have been logged out since your time elapsed" };
          } else {
            console.log("COMPLIANTTT");
            return { msg: "user " + User.getUserById(user) + " is currently compliant" };
          }
        } else {
          return { msg: "Error calculating time elapsed" };
        }
      } catch (error) {
        console.error("Error during background check", error);
      }
    });

    setInterval(() => this.backgroundCheck(), 3 * 60 * 1000); // check every 3 minutes
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

  @Router.post("/reactions/:_id")
  async createUpvote(session: WebSessionDoc, _id: ObjectId, options?: ReactionOptions) {
    // citation: gpt for cleaner code (and debugging).
    const user = WebSession.getUser(session);
    const post = (await Post.getPostById(_id))._id;

    try {
      const limit = await Limit.getRemaining(user, "reaction");
      if (limit.remaining <= 0) {
        return { msg: `You have run out of resources. Try again in ${await Limit.timeUntilReset(user, "reaction")}` };
      }

      const created = await Reaction.upvote(user, post, options);
      await Limit.decrement(user, 1, "reaction");

      return {
        msg: created.msg,
        upvote: await Responses.reaction(created.reaction),
        remaining: (await Limit.getRemaining(user, "reaction")).remaining,
      };
    } catch (error) {
      await Limit.setLimit(user, 20, "reaction");
      return {
        msg: error instanceof Error ? error.message : "You did not set a reaction limit. Try again.",
        remaining: (await Limit.getRemaining(user, "reaction")).remaining,
      };
    }
  }

  @Router.delete("/reactions/:_id")
  async deleteUpvote(session: WebSessionDoc, _id: ObjectId, options?: ReactionOptions) {
    // citation: gpt for cleaner code (and debugging).
    const user = WebSession.getUser(session);
    const post = (await Post.getPostById(_id))._id;

    try {
      const limit = await Limit.getRemaining(user, "reaction");
      if (limit.remaining <= 0) {
        return { msg: `You have run out of resources. Try again in ${await Limit.timeUntilReset(user, "reaction")}` };
      }

      const created = await Reaction.downvote(user, post, options);
      await Limit.decrement(user, 1, "reaction");

      return {
        msg: created.msg,
        upvote: await Responses.reaction(created.reaction),
        remaining: (await Limit.getRemaining(user, "reaction")).remaining,
      };
    } catch (error) {
      await Limit.setLimit(user, 20, "reaction");
      return {
        msg: error instanceof Error ? error.message : "You did not set a reaction limit. Try again.",
        remaining: (await Limit.getRemaining(user, "reaction")).remaining,
      };
    }
  }

  @Router.get("/reactions")
  async getPostReactionCount(target: ObjectId) {
    return await Reaction.getReactionCount(target);
  }

  @Router.get("/reactions/:user")
  async getReactions(author?: string) {
    // Citation: posts implementation above and gpt for debugging
    let reactions;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      reactions = await Reaction.getByAuthor(id);
      const upvotedPostIds = reactions.map((reaction) => reaction.target);
      const upvotedPosts = await Post.getPosts({ _id: { $in: upvotedPostIds } });
      reactions = upvotedPosts;
    } else {
      reactions = await Reaction.getReactions({});
    }
    return reactions;
  }

  @Router.post("/notifications")
  async createNotification(session: WebSessionDoc, content: string, options?: NotificationOptions) {
    const user = WebSession.getUser(session);
    const userCanSendNotifications = await Notification.checkCanSend(user);
    if (userCanSendNotifications === false) {
      throw new Error("Recipient cannot receive notifications");
    }
    const created = await Notification.send(user, content, options);
    return { msg: created.msg, notification: await Responses.notification(created.post) };
  }

  @Router.put("/notifications/markread/:_id")
  async markAsRead(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Notification.isRecipient(user, _id);
    return await Notification.markAsRead(_id);
  }

  @Router.put("/notifications/markunread/:_id")
  async markAsUnread(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Notification.isRecipient(user, _id);
    return await Notification.markAsUnread(_id);
  }

  @Router.get("/notifications/read")
  async getReadNotifications(recipient?: string) {
    if (recipient) {
      const id = (await User.getUserByUsername(recipient))._id;
      return await Notification.getRead(id);
    } else {
      return { msg: "Could not get read" };
    }
  }

  @Router.get("/notifications/unread")
  async getUnreadNotifications(recipient?: string) {
    if (recipient) {
      const id = (await User.getUserByUsername(recipient))._id;
      return await Notification.getUnread(id);
    } else {
      return { msg: "Could not get unread" };
    }
  }

  @Router.get("/notifications/all")
  async getAll(recipient?: string) {
    if (recipient) {
      const id = (await User.getUserByUsername(recipient))._id;
      return await Notification.getAll(id);
    } else {
      return { msg: "Could not get all of user's notifications" };
    }
  }

  @Router.delete("/notifications/clear")
  async clearNotifications(recipient?: string) {
    try {
      if (recipient) {
        WebSession.isLoggedIn;
        const id = (await User.getUserByUsername(recipient))._id;
        const result = await Notification.clearNotifications(new ObjectId(id));
        return { msg: "Notifications cleared successfully", result };
      } else {
        return { msg: "Could not clear notifications" };
      }
    } catch (error) {
      return { msg: "Error clearing notifications:", error };
    }
  }

  @Router.delete("/notifications/:_notificationId")
  async deleteNotification(session: WebSessionDoc, _notificationId: ObjectId) {
    const user = WebSession.getUser(session);
    try {
      await Notification.isRecipient(user, _notificationId);
      const result = await Notification.deleteNotification(_notificationId);
      return { msg: "Notification deleted successfully", result };
    } catch (error) {
      return { msg: "Error deleting notification", error };
    }
  }

  @Router.put("/notifications/unsubscribe")
  async unsubscribe(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Notification.unsubscribe(user);
  }

  @Router.put("/notifications/subscribe")
  async subscribe(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Notification.subscribe(user);
  }

  @Router.post("/limits/resource")
  async createLimit(receiverId: ObjectId, limit: number, type: string, options?: LimitOptions) {
    return await Limit.setLimit(receiverId, limit, type, options);
  }

  @Router.put("/limits/resource") // need user not found and user is recipient for all limits
  async decrementLimit(receiverId: ObjectId, limit: number, type: string) {
    return await Limit.decrement(receiverId, limit, type);
  }

  @Router.get("/limits/resource")
  async getRemaining(receiverId: ObjectId, type: string) {
    return await Limit.getRemaining(receiverId, type);
  }

  @Router.put("/limits/reset")
  async resetLimit(receiverId: ObjectId, type: string) {
    return await Limit.reset(receiverId, type);
  }

  @Router.get("/limits/status")
  async getStatus(receiverId: ObjectId, type: string) {
    return await Limit.getStatus(receiverId, type);
  }

  @Router.get("/limits/waitime") // need user not found and user is recipient for all limits
  async getTimeToReset(receiverId: ObjectId, type: string) {
    return await Limit.timeUntilReset(receiverId, type);
  }
}

export default getExpressRouter(new Routes());
