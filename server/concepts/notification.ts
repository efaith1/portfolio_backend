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

  async clearNotificationHelper(query: Filter<NotificationDoc>) {
    await this.notifications.deleteMany(query);
    return;
  }

  async send(recipient: ObjectId, content: string, options?: NotificationOptions) {
    const _id = await this.notifications.createOne({ recipient, content, options });
    return { msg: "Notification sent successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async markAsRead(_notificationId: ObjectId, update: Partial<NotificationDoc>) {
    const _id = await this.notifications.updateOne({ _notificationId }, update);
    return { msg: "Notification marked as Read successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async markAsUnread(_notificationId: ObjectId, update: Partial<NotificationDoc>) {
    const _id = await this.notifications.updateOne({ _notificationId }, update);
    return { msg: "Notification marked as Unread successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async getRead(recipientId: ObjectId) {
    return await this.getNotifications({ recipientId, read: true });
  }

  async getUnread(recipientId: ObjectId) {
    return await this.getNotifications({ recipientId, read: false });
  }

  async clearNotifications(notificationId: ObjectId) {
    return await this.clearNotificationHelper({ notificationId }); // delete one vs delete all (user ID)
  }

  async unsubscribe(user: ObjectId, update: Partial<NotificationDoc>) {
    const _id = await this.notifications.updateOne({ user }, update);
    return { msg: "User unsubscribed successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const notification = await this.notifications.readOne({ _id });
    if (!notification) {
      throw new NotFoundError(`notification ${_id} does not exist!`);
    }
    if (notification.recipient.toString() !== user.toString()) {
      throw new NotificationAuthorNotMatchError(user, _id);
    }
  }
}

export class NotificationAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of notification {1}!", author, _id);
  }
}
