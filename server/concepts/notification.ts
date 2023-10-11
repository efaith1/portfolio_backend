import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface NotificationOptions {
  backgroundColor?: string;
}

export interface NotificationDoc extends BaseDoc {
  recipient: ObjectId;
  content: string;
  read: Boolean;
  canSend: Boolean;
  options?: NotificationOptions;
}

export default class NotificationConcept {
  public readonly notifications = new DocCollection<NotificationDoc>("notifications");

  async getNotifications(query: Filter<NotificationDoc>) {
    const notifications = await this.notifications.readMany(query, {
      sort: { dateCreated: -1 },
    });
    return notifications;
  }

  async send(recipient: ObjectId, content: string, options?: NotificationOptions) {
    const _id = await this.notifications.createOne({ recipient, content, read: false, canSend: true, options });
    return { msg: "Notification sent successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async markAsRead(_notificationId: ObjectId) {
    const existingNotification = await this.notifications.readOne({ _id: _notificationId });
    if (!existingNotification) {
      throw new Error("Notification not found");
    }
    const update = { read: true };
    const marked = await this.notifications.updateOne({ _id: _notificationId }, update);
    return { msg: "Notification marked as Read successfully!", marked };
  }

  async markAsUnread(_notificationId: ObjectId) {
    const existingNotification = await this.notifications.readOne({ _id: _notificationId });
    if (!existingNotification) {
      throw new Error("Notification not found");
    }
    const update = { read: false };
    const unmarked = await this.notifications.updateOne({ _id: _notificationId }, update);
    return { msg: "Notification marked as Unread successfully!", unmarked };
  }

  async getRead(recipientId: ObjectId) {
    const query = {
      recipient: new ObjectId(recipientId),
      read: true,
    };
    return await this.getNotifications(query);
  }

  async getUnread(recipientId: ObjectId) {
    const query = {
      recipient: new ObjectId(recipientId),
      read: false,
    };
    return await this.getNotifications(query);
  }

  async getAll(recipientId: ObjectId) {
    const query = {
      recipient: new ObjectId(recipientId),
    };
    return await this.getNotifications(query);
  }

  async deleteNotification(notificationId: ObjectId) {
    const existingNotification = await this.notifications.readOne({ _id: notificationId });
    if (!existingNotification) {
      throw new Error("Notification not found");
    }
    return await this.notifications.deleteOne({ _id: notificationId });
  }

  async clearNotifications(recipientId: ObjectId) {
    return await this.notifications.deleteMany({ recipient: new ObjectId(recipientId) });
  }

  async unsubscribe(user: ObjectId) {
    const userNotification = await this.notifications.readOne({ recipient: user });
    if (!userNotification) {
      throw new Error("User is already unsubscribed");
    }
    if (userNotification.canSend === false) {
      throw new Error("User is already unsubscribed");
    }
    const update = { canSend: false };
    const unsubscribed = await this.notifications.updateOne({ recipient: user }, update);
    return { msg: "Recipient unsubscribed successfully!", unsubscribed };
  }

  async subscribe(user: ObjectId) {
    const userNotification = await this.notifications.readOne({ recipient: user });
    if (userNotification) {
      if (userNotification.canSend) {
        throw new Error("User is already subscribed");
      }
    }
    const update = { canSend: true };
    const subscribed = await this.notifications.updateOne({ recipient: user }, update);
    return { msg: "Recipient subscribed successfully!", subscribed };
  }

  async isRecipient(user: ObjectId, _notificationId: ObjectId) {
    const notification = await this.notifications.readOne({ _id: _notificationId });
    if (notification === null) {
      throw new NotFoundError(`notification ${_notificationId} does not exist!`);
    }
    if (notification.recipient.toString() !== user.toString()) {
      throw new NotificationAuthorNotMatchError(user, _notificationId);
    }
  }

  async checkCanSend(user: ObjectId) {
    const userNotification = await this.notifications.readOne({ recipient: user });
    if (!userNotification) {
      return true;
    }
    return userNotification.canSend;
  }
}

export class NotificationAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("You cannot delete a notification unless you are the recipient!", author, _id);
  }
}
