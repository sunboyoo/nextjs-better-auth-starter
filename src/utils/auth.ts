type AdminRole = "user" | "admin" | Array<"user" | "admin">;

type RequestAdminEndpointOptions = {
  url: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  defaultErrorMessage: string;
};

async function requestAdminEndpoint<T = unknown>({
  url,
  method = "POST",
  body,
  defaultErrorMessage,
}: RequestAdminEndpointOptions): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "include",
    headers:
      body === undefined
        ? undefined
        : {
            "Content-Type": "application/json",
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: unknown };
  if (!response.ok) {
    const message =
      typeof data.error === "string" ? data.error : defaultErrorMessage;
    throw new Error(message);
  }

  return data as T;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export async function banUser(
  userId: string,
  banReason: string,
  banExpiresIn?: number,
) {
  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}`,
    method: "PATCH",
    body: {
      action: "ban",
      banReason,
      banExpiresIn,
    },
    defaultErrorMessage: "Failed to ban user",
  });
}

export async function unbanUser(userId: string) {
  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}`,
    method: "PATCH",
    body: {
      action: "unban",
    },
    defaultErrorMessage: "Failed to unban user",
  });
}

export async function deleteUser(userId: string) {
  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}`,
    method: "DELETE",
    defaultErrorMessage: "Failed to delete user",
  });
}

export async function revokeUserSessions(userId: string) {
  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}/sessions`,
    method: "DELETE",
    defaultErrorMessage: "Failed to revoke user sessions",
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: AdminRole;
  data?: Record<string, unknown>;
  autoVerify?: boolean;
}) {
  const { autoVerify, ...userData } = data;
  const createData = {
    ...userData,
    data: {
      ...userData.data,
      ...(autoVerify ? { emailVerified: true } : {}),
    },
  };

  const result = await requestAdminEndpoint({
    url: "/api/admin/users",
    method: "POST",
    body: createData,
    defaultErrorMessage: "Failed to create user",
  });

  if (!autoVerify) {
    try {
      await sendUserVerificationEmail(data.email, "/dashboard");
    } catch (error) {
      console.error("Failed to send verification email:", error);
    }
  }

  return result;
}

export async function updateUserRole(userId: string, role: string) {
  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}`,
    method: "PATCH",
    body: {
      action: "set-role",
      role,
    },
    defaultErrorMessage: "Failed to update user role",
  });
}

export async function updateUserName(userId: string, name: string) {
  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}`,
    method: "PATCH",
    body: {
      action: "update-user",
      data: { name },
    },
    defaultErrorMessage: "Failed to update user name",
  });
}

export async function updateUserEmailDirect(
  userId: string,
  email: string,
  options?: { emailVerified?: boolean },
) {
  const data: Record<string, unknown> = { email };
  if (typeof options?.emailVerified === "boolean") {
    data.emailVerified = options.emailVerified;
  }

  return requestAdminEndpoint({
    url: `/api/admin/users/${encodePathSegment(userId)}`,
    method: "PATCH",
    body: {
      action: "update-user",
      data,
    },
    defaultErrorMessage: "Failed to update user email",
  });
}

export async function updateUserEmailAndMarkUnverified(
  userId: string,
  email: string,
) {
  return updateUserEmailDirect(userId, email, { emailVerified: false });
}

export async function updateUserEmailAndMarkVerified(
  userId: string,
  email: string,
) {
  return updateUserEmailDirect(userId, email, { emailVerified: true });
}

export async function sendUserVerificationEmail(
  email: string,
  callbackURL = "/dashboard",
) {
  return requestAdminEndpoint({
    url: "/api/admin/users/send-verification-email",
    method: "POST",
    body: { email, callbackURL },
    defaultErrorMessage: "Failed to send verification email",
  });
}

export async function triggerUserEmailChangeVerification(
  userId: string,
  newEmail: string,
  callbackURL = "/dashboard",
) {
  return requestAdminEndpoint<{ emailMismatch?: boolean }>({
    url: `/api/admin/users/${encodePathSegment(
      userId,
    )}/trigger-email-change-verification`,
    method: "POST",
    body: { newEmail, callbackURL },
    defaultErrorMessage: "Failed to trigger email change verification",
  });
}

export async function setUserPassword(userId: string, newPassword: string) {
  return requestAdminEndpoint({
    url: "/api/admin/users/set-password",
    method: "POST",
    body: { userId, newPassword },
    defaultErrorMessage: "Failed to set user password",
  });
}
