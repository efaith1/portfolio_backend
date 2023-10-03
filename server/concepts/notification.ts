import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface NotificationOptions {
  backgroundColor?: string;
}

export interface NotificationDoc extends BaseDoc {
  notification: ObjectId;
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

  async markAsRead(notification: ObjectId, update: Partial<NotificationDoc>) {
    const _id = await this.notifications.updateOne({ notification }, update);
    return { msg: "Notification marked as Read successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async markAsUnread(notification: ObjectId, update: Partial<NotificationDoc>) {
    const _id = await this.notifications.updateOne({ notification }, update);
    return { msg: "Notification marked as Unread successfully!", post: await this.notifications.readOne({ _id }) };
  }

  async listRead(id: ObjectId) {
    return await this.getNotifications({ id, read: true });
  }

  async listUnread(id: ObjectId) {
    return await this.getNotifications({ id, read: false });
  }

  async clearNotifications(notification: ObjectId) {
    return await this.clearNotificationHelper({ notification });
  }

  async getNotificationById(id: ObjectId) {
    return await this.getNotifications({ id });
  }

  async unsubscribe(user: ObjectId, update: Partial<NotificationDoc>) {
    const _id = await this.notifications.replaceOne({ user }, update);
    return { msg: "User unsubscribed successfully!", post: await this.notifications.readOne({ _id }) };
  }
}
