import FriendConcept from "./concepts/friend";
import LimitConcept from "./concepts/limit";
import NotificationConcept from "./concepts/notification";
import PostConcept from "./concepts/post";
import ReactionConcept from "./concepts/reaction";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Reaction = new ReactionConcept();
export const Notification = new NotificationConcept();
export const Limit = new LimitConcept();
