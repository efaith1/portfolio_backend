import { SessionData } from "express-session";
import { ObjectId } from "mongodb";
import { NotAllowedError, UnauthenticatedError } from "./errors";

export type WebSessionDoc = SessionData;

// This allows us to overload express session data type.
// Express session does not support non-string values over requests.
// We'll be using this to store the user _id in the session.
declare module "express-session" {
  export interface SessionData {
    user?: string;
    loginTime: Date;
    logoutTime: Date;
  }
}

export default class WebSessionConcept {
  // Array to store active sessions
  private activeSessions: WebSessionDoc[] = [];

  // Add an active session to the array
  private addActiveSession(session: WebSessionDoc) {
    this.activeSessions.push(session);
  }

  // Remove an active session from the array
  private removeActiveSession(session: WebSessionDoc) {
    this.activeSessions = this.activeSessions.filter((activeSession) => activeSession !== session);
  }

  // Get all logged-in sessions
  getActiveSessions(): WebSessionDoc[] {
    return this.activeSessions.filter((session) => session.user !== undefined);
  }

  start(session: WebSessionDoc, user: ObjectId) {
    this.isLoggedOut(session);
    session.user = user.toString();
    session.loginTime = new Date(); // Record the login timestamp
    this.addActiveSession(session);
  }

  end(session: WebSessionDoc) {
    this.isLoggedIn(session);
    session.user = undefined;
    session.logoutTime = new Date(); // Record the logout timestamp
    this.removeActiveSession(session);
  }

  getUser(session: WebSessionDoc) {
    this.isLoggedIn(session);
    return new ObjectId(session.user);
  }

  isLoggedIn(session: WebSessionDoc) {
    if (session.user === undefined) {
      throw new UnauthenticatedError("Must be logged in!");
    }
  }

  isLoggedOut(session: WebSessionDoc) {
    if (session.user !== undefined) {
      throw new NotAllowedError("Must be logged out!");
    }
  }

  calculateTimeLoggedIn(session: WebSessionDoc) {
    try {
      const loginTime = new Date(session.loginTime);
      if (!isNaN(loginTime.getTime())) {
        const logoutTime = new Date(session.logoutTime);
        if (!isNaN(logoutTime.getTime())) {
          const timeDiffInMilliseconds = Math.abs(logoutTime.getTime() - loginTime.getTime());
          return timeDiffInMilliseconds;
        }
      }
      return "Could not get logout time";
    } catch (error) {
      return error ? error : "Could not get logout time";
    }
  }
}
