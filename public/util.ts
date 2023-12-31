type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type InputTag = "input" | "textarea";
type Field = InputTag | { [key: string]: Field };
type Fields = Record<string, Field>;

type operation = {
  name: string;
  endpoint: string;
  method: HttpMethod;
  fields: Fields;
};

const operations: operation[] = [
  {
    name: "Get Session User (logged in user)",
    endpoint: "/api/session",
    method: "GET",
    fields: {},
  },
  {
    name: "Create User",
    endpoint: "/api/users",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Login",
    endpoint: "/api/login",
    method: "POST",
    fields: { username: "input", password: "input" },
  },
  {
    name: "Logout",
    endpoint: "/api/logout",
    method: "POST",
    fields: {},
  },
  {
    name: "Update User",
    endpoint: "/api/users",
    method: "PATCH",
    fields: { update: { username: "input", password: "input" } },
  },
  {
    name: "Delete User",
    endpoint: "/api/users",
    method: "DELETE",
    fields: {},
  },
  {
    name: "Get Users",
    endpoint: "/api/users/:username",
    method: "GET",
    fields: { username: "input" },
  },
  {
    name: "Create Post",
    endpoint: "/api/posts",
    method: "POST",
    fields: { content: "input" },
  },
  {
    name: "Get Posts",
    endpoint: "/api/posts",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Update Post",
    endpoint: "/api/posts/:id",
    method: "PATCH",
    fields: { id: "input", update: { content: "input", options: { backgroundColor: "input" } } },
  },
  {
    name: "Delete Post",
    endpoint: "/api/posts/:id",
    method: "DELETE",
    fields: { id: "input" },
  },
  {
    name: "Create Upvote",
    endpoint: "/api/reactions/:postId",
    method: "POST",
    fields: { postId: "input" },
  },
  {
    name: "Delete Upvote",
    endpoint: "/api/reactions/:postId",
    method: "DELETE",
    fields: { postId: "input" },
  },
  {
    name: "Get Posts's Reaction Count",
    endpoint: "/api/reactions",
    method: "GET",
    fields: { target: "input" },
  },
  {
    name: "Get User's Upvoted Posts",
    endpoint: "/api/reactions/:user",
    method: "GET",
    fields: { author: "input" },
  },
  {
    name: "Create Notification",
    endpoint: "/api/notifications",
    method: "POST",
    fields: { recipient: "input", content: "input" },
  },
  {
    name: "Mark As Read",
    endpoint: "/api/notifications/markread/:notificationId",
    method: "PUT",
    fields: { notificationId: "input" },
  },
  {
    name: "Mark As Unread",
    endpoint: "/api/notifications/markunread/:notificationId",
    method: "PUT",
    fields: { notificationId: "input" },
  },
  {
    name: "Get All Notifications",
    endpoint: "/api/notifications/all",
    method: "GET",
    fields: { recipient: "input" },
  },
  {
    name: "Get Read Notifications",
    endpoint: "/api/notifications/read",
    method: "GET",
    fields: { recipient: "input" },
  },
  {
    name: "Get Unread Notifications",
    endpoint: "/api/notifications/unread",
    method: "GET",
    fields: { recipient: "input" },
  },
  {
    name: "Delete Notifications",
    endpoint: "/api/notifications/:notificationId",
    method: "DELETE",
    fields: { notificationId: "input" },
  },
  {
    name: "Clear all Notifications",
    endpoint: "/api/notifications/clear",
    method: "DELETE",
    fields: { recipient: "input" },
  },
  {
    name: "Unsubscribe from Notifications",
    endpoint: "/api/notifications/unsubscribe",
    method: "PUT",
    fields: { userId: "input" },
  },
  {
    name: "Subscribe to Notifications",
    endpoint: "/api/notifications/subscribe",
    method: "PUT",
    fields: { userId: "input" },
  },
  {
    name: "Create Limit (use type=reaction for upvotes, type=loginToken for session)",
    endpoint: "/api/limits/resource",
    method: "POST",
    fields: { receiverId: "input", limit: "input", type: "input" },
  },
  {
    name: "Decrement Limit",
    endpoint: "/api/limits/resource",
    method: "PUT",
    fields: { receiverId: "input", limit: "input", type: "input" },
  },
  {
    name: "Get Remaining Limit",
    endpoint: "/api/limits/resource",
    method: "GET",
    fields: { receiverId: "input", type: "input" },
  },
  {
    name: "Reset Limit",
    endpoint: "/api/limits/reset",
    method: "PUT",
    fields: { receiverId: "input", type: "input" },
  },
  {
    name: "Get Status",
    endpoint: "/api/limits/status",
    method: "GET",
    fields: { receiverId: "input", type: "input" },
  },
  {
    name: "Get Time Until Limit Reset",
    endpoint: "/api/limits/waitime",
    method: "GET",
    fields: { receiverId: "input", type: "input" },
  },
];

// Do not edit below here.
// If you are interested in how this works, feel free to ask on forum!

function updateResponse(code: string, response: string) {
  document.querySelector("#status-code")!.innerHTML = code;
  document.querySelector("#response-text")!.innerHTML = response;
}

async function request(method: HttpMethod, endpoint: string, params?: unknown) {
  try {
    if (method === "GET" && params) {
      endpoint += "?" + new URLSearchParams(params as Record<string, string>).toString();
      params = undefined;
    }

    const res = fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: params ? JSON.stringify(params) : undefined,
    });

    return {
      $statusCode: (await res).status,
      $response: await (await res).json(),
    };
  } catch (e) {
    console.log(e);
    return {
      $statusCode: "???",
      $response: { error: "Something went wrong, check your console log.", details: e },
    };
  }
}

function fieldsToHtml(fields: Record<string, Field>, indent = 0, prefix = ""): string {
  return Object.entries(fields)
    .map(([name, tag]) => {
      return `
        <div class="field" style="margin-left: ${indent}px">
          <label>${name}:
          ${typeof tag === "string" ? `<${tag} name="${prefix}${name}"></${tag}>` : fieldsToHtml(tag, indent + 10, prefix + name + ".")}
          </label>
        </div>`;
    })
    .join("");
}

function getHtmlOperations() {
  return operations.map((operation) => {
    return `<li class="operation">
      <h3>${operation.name}</h3>
      <form class="operation-form">
        <input type="hidden" name="$endpoint" value="${operation.endpoint}" />
        <input type="hidden" name="$method" value="${operation.method}" />
        ${fieldsToHtml(operation.fields)}
        <button type="submit">Submit</button>
      </form>
    </li>`;
  });
}

function prefixedRecordIntoObject(record: Record<string, string>) {
  const obj: any = {}; // eslint-disable-line
  for (const [key, value] of Object.entries(record)) {
    if (!value) {
      continue;
    }
    const keys = key.split(".");
    const lastKey = keys.pop()!;
    let currentObj = obj;
    for (const key of keys) {
      if (!currentObj[key]) {
        currentObj[key] = {};
      }
      currentObj = currentObj[key];
    }
    currentObj[lastKey] = value;
  }
  return obj;
}

async function submitEventHandler(e: Event) {
  e.preventDefault();
  const form = e.target as HTMLFormElement;
  const { $method, $endpoint, ...reqData } = Object.fromEntries(new FormData(form));

  // Replace :param with the actual value.
  const endpoint = ($endpoint as string).replace(/:(\w+)/g, (_, key) => {
    const param = reqData[key] as string;
    delete reqData[key];
    return param;
  });

  const data = prefixedRecordIntoObject(reqData as Record<string, string>);

  updateResponse("", "Loading...");
  const response = await request($method as HttpMethod, endpoint as string, Object.keys(data).length > 0 ? data : undefined);
  updateResponse(response.$statusCode.toString(), JSON.stringify(response.$response, null, 2));
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#operations-list")!.innerHTML = getHtmlOperations().join("");
  document.querySelectorAll(".operation-form").forEach((form) => form.addEventListener("submit", submitEventHandler));
});
